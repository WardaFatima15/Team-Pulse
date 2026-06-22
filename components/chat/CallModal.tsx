"use client"

import { useState, useEffect, useRef } from "react"
import { PhoneOff, Mic, MicOff, Video, VideoOff, AlertCircle, Monitor, MonitorOff } from "lucide-react"

type Props =
  | { mode: "caller"; calleeId: string; calleeName: string; onEnd: () => void }
  | { mode: "callee"; callId: string; callerName: string; sdpOffer: string; onEnd: () => void }

function useCallTimer(running: boolean) {
  const [s, setS] = useState(0)
  useEffect(() => {
    if (!running) { setS(0); return }
    const id = setInterval(() => setS(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}

function postCandidate(callId: string, side: string, candidate: string) {
  fetch(`/api/calls/${callId}/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ side, candidate }),
  }).catch(() => {})
}

export default function CallModal(props: Props) {
  const contactName = props.mode === "caller" ? props.calleeName : props.callerName
  const ini = contactName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  const [phase, setPhase] = useState<"ringing" | "connected" | "failed">("ringing")
  const [failReason, setFailReason] = useState("")
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)
  const screenStreamRef = useRef<MediaStream | null>(null)

  const duration = useCallTimer(phase === "connected")

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const callIdRef = useRef<string>(props.mode === "callee" ? props.callId : "")
  const endedRef = useRef(false)
  const connectedRef = useRef(false)
  const answerSetRef = useRef(false)    // caller: true after setRemoteDescription(answer)
  const remoteDescSetRef = useRef(false) // callee: true after setRemoteDescription(offer)
  const processedRef = useRef(0)        // count of remote ICE candidates already added

  function cleanup() {
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
  }

  function patchStatus(status: string) {
    const cid = callIdRef.current
    if (!cid) return
    fetch(`/api/calls/${cid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {})
  }

  function fail(reason: string) {
    if (endedRef.current) return
    endedRef.current = true
    cleanup()
    patchStatus("ended")
    setPhase("failed")
    setFailReason(reason)
  }

  function endCall() {
    if (endedRef.current) return
    endedRef.current = true
    cleanup()
    patchStatus("ended")
    props.onEnd()
  }

  function markConnected() {
    if (connectedRef.current) return
    connectedRef.current = true
    setPhase("connected")
    // Boost audio bitrate once connected
    try {
      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === "audio")
      if (sender) {
        const params = sender.getParameters()
        if (!params.encodings.length) params.encodings = [{}]
        params.encodings[0].maxBitrate = 128_000
        sender.setParameters(params).catch(() => {})
      }
    } catch { /* ignore */ }
  }

  // ── Setup WebRTC (runs once on mount) ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function setup() {
      // 1. Get media — high-quality audio constraints; fallback to audio-only, then empty
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
      }
      let stream: MediaStream
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: true }) }
      catch { try { stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints }) } catch { stream = new MediaStream() } }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      // 2. Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
          { urls: "stun:stun4.l.google.com:19302" },
        ],
      })
      pcRef.current = pc

      // 3. Add local tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Prefer Opus codec at high bitrate for better voice quality
      try {
        for (const transceiver of pc.getTransceivers()) {
          if (transceiver.receiver.track?.kind === "audio") {
            const caps = RTCRtpSender.getCapabilities("audio")
            if (caps) {
              const opus = caps.codecs.filter(c => c.mimeType.toLowerCase() === "audio/opus")
              if (opus.length) transceiver.setCodecPreferences(opus)
            }
            break
          }
        }
      } catch { /* not supported on all browsers */ }

      // 4. Connection state → mark connected / fail
      pc.onconnectionstatechange = () => {
        if (cancelled) return
        if (pc.connectionState === "connected") markConnected()
        if (pc.connectionState === "failed") fail("Connection failed. Check your network and try again.")
      }
      pc.oniceconnectionstatechange = () => {
        if (cancelled) return
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") markConnected()
        if (pc.iceConnectionState === "failed") fail("Could not reach the other person.")
      }

      // 5. Remote tracks → show in video element
      pc.ontrack = e => {
        if (cancelled || !remoteVideoRef.current) return
        remoteVideoRef.current.srcObject = e.streams[0]
        setHasRemoteVideo(e.streams[0].getVideoTracks().length > 0)
      }

      if (props.mode === "caller") {
        // ── Caller flow ──────────────────────────────────────────────────────────
        // Buffer candidates that arrive before we get the callId from the server
        const pendingCands: string[] = []
        let gotCallId = false

        pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
          if (!e.candidate) return
          const json = JSON.stringify(e.candidate.toJSON())
          if (gotCallId && callIdRef.current) {
            postCandidate(callIdRef.current, "caller", json)
          } else {
            pendingCands.push(json)
          }
        }

        // Create offer and set local description immediately (no waiting for ICE)
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        await pc.setLocalDescription(offer)
        if (cancelled) return

        // POST call session — offer SDP has no candidates yet (trickle ICE)
        const res = await fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calleeId: props.calleeId,
            calleeName: props.calleeName,
            sdpOffer: offer.sdp,
          }),
        })
        if (!res.ok) { if (!cancelled) fail("Server error starting call."); return }
        if (cancelled) return

        const { id } = await res.json()
        callIdRef.current = id
        gotCallId = true

        // Flush candidates that arrived before we had the callId
        for (const c of pendingCands) postCandidate(id, "caller", c)

      } else {
        // ── Callee flow ──────────────────────────────────────────────────────────
        // Set onicecandidate BEFORE setRemoteDescription so no candidates are missed
        pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
          if (!e.candidate) return
          postCandidate(props.callId, "callee", JSON.stringify(e.candidate.toJSON()))
        }

        await pc.setRemoteDescription({ type: "offer", sdp: props.sdpOffer })
        remoteDescSetRef.current = true

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        if (cancelled) return

        // Send answer immediately (trickle ICE — candidates go separately)
        await fetch(`/api/calls/${props.callId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sdpAnswer: answer.sdp }),
        })
      }

      // 6. 30s hard timeout
      if (!cancelled) {
        setTimeout(() => {
          if (!connectedRef.current && !endedRef.current && !cancelled) {
            fail("Could not connect after 30 seconds. Make sure both sides allow camera/microphone access.")
          }
        }, 30_000)
      }
    }

    setup().catch(err => {
      if (!cancelled) fail("Setup error: " + (err?.message ?? String(err)))
    })

    return () => {
      cancelled = true
      cleanup()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Signaling poll: session status + remote ICE candidates ────────────────────
  useEffect(() => {
    const remoteSide = props.mode === "caller" ? "callee" : "caller"

    const poll = async () => {
      const cid = callIdRef.current
      if (!cid || endedRef.current) return
      const pc = pcRef.current
      if (!pc || pc.signalingState === "closed") return

      // Check session status and pick up sdpAnswer (caller only)
      const session = await fetch(`/api/calls/${cid}`)
        .then(r => r.json()).catch(() => null)
      if (!session || endedRef.current) return

      if (session.status === "rejected") { fail("Call was declined."); return }
      if (session.status === "ended") {
        if (!endedRef.current) { endedRef.current = true; cleanup(); props.onEnd() }
        return
      }

      // Caller: set remote description once answer arrives
      if (props.mode === "caller" && !answerSetRef.current && session.sdpAnswer) {
        try {
          await pc.setRemoteDescription({ type: "answer", sdp: session.sdpAnswer })
          answerSetRef.current = true
        } catch { /* PC closed or already set */ }
      }

      // Add remote ICE candidates once remote description is set on our side
      const canProcess = props.mode === "caller" ? answerSetRef.current : remoteDescSetRef.current
      if (!canProcess) return

      const rows: { candidate: string }[] = await fetch(
        `/api/calls/${cid}/candidates?side=${remoteSide}&offset=${processedRef.current}`
      ).then(r => r.json()).catch(() => [])

      for (const row of rows) {
        try {
          await pc.addIceCandidate(JSON.parse(row.candidate))
          processedRef.current += 1
        } catch { processedRef.current += 1 /* skip bad candidates */ }
      }
    }

    const id = setInterval(poll, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode])

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted })
    setMuted(m => !m)
  }
  function toggleCam() {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOff })
    setCamOff(v => !v)
  }

  async function toggleScreenShare() {
    const pc = pcRef.current
    if (!pc) return

    if (screenSharing) {
      // Stop screen share, restore camera track
      screenStreamRef.current?.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
      const camTrack = localStreamRef.current?.getVideoTracks()[0]
      const sender = pc.getSenders().find(s => s.track?.kind === "video")
      if (sender && camTrack) {
        await sender.replaceTrack(camTrack).catch(() => {})
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
      }
      setScreenSharing(false)
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        screenStreamRef.current = screen
        const screenTrack = screen.getVideoTracks()[0]
        const sender = pc.getSenders().find(s => s.track?.kind === "video")
        if (sender) await sender.replaceTrack(screenTrack).catch(() => {})
        // Show screen in local preview
        if (localVideoRef.current) {
          const previewStream = new MediaStream([screenTrack])
          localVideoRef.current.srcObject = previewStream
        }
        // Auto-stop when user clicks browser's "Stop sharing"
        screenTrack.onended = () => toggleScreenShare()
        setScreenSharing(true)
      } catch { /* user cancelled or denied */ }
    }
  }

  // ── Failed screen ─────────────────────────────────────────────────────────────
  if (phase === "failed") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="bg-[#0d0d0d] rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full border border-white/10">
          <div className="size-14 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="size-7 text-red-400" />
          </div>
          <p className="text-white font-bold text-lg">Call Failed</p>
          <p className="text-white/50 text-sm text-center">{failReason}</p>
          <button
            onClick={() => props.onEnd()}
            className="mt-2 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const statusLabel = phase === "ringing"
    ? (props.mode === "caller" ? "Calling…" : "Connecting…")
    : duration

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className="relative w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxWidth: 680, background: "linear-gradient(160deg,#12082a 0%,#0d0d0d 60%)" }}
      >
        <div className="absolute inset-x-0 top-0 h-64 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% -20%,rgba(81,47,235,.35) 0%,transparent 70%)" }} />

        <div className="relative z-10 flex flex-col items-center pt-10 pb-6 px-6">
          <div className="relative mb-5">
            {phase === "ringing" && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-[#512feb]/40 animate-ping" style={{ transform: "scale(1.5)" }} />
                <div className="absolute inset-0 rounded-full border-2 border-[#512feb]/20 animate-ping" style={{ transform: "scale(2.2)", animationDelay: "0.4s" }} />
              </>
            )}
            {phase === "connected" && (
              <div className="absolute -inset-1.5 rounded-full border-2 border-green-400/60 animate-pulse" />
            )}
            <div className="size-24 rounded-full bg-gradient-to-br from-[#512feb] to-[#7c5af5] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-[#512feb]/30 relative z-10">
              {ini}
            </div>
          </div>
          <p className="text-white text-2xl font-bold tracking-tight">{contactName}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-white/50 text-sm tabular-nums">{statusLabel}</p>
            {phase === "connected" && <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />}
          </div>
        </div>

        {/* Video container — always in DOM so refs are valid when ontrack/srcObject fire during ringing */}
        <div className={`relative mx-6 mb-6 rounded-2xl overflow-hidden bg-slate-900 shadow-inner${phase === "connected" ? "" : " hidden"}`} style={{ aspectRatio: "16/9" }}>
          <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${hasRemoteVideo ? "" : "hidden"}`} />
          {!hasRemoteVideo && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="size-20 rounded-full bg-gradient-to-br from-[#512feb] to-[#7c5af5] flex items-center justify-center text-white text-3xl font-bold">{ini}</div>
              <p className="text-white/40 text-sm">No camera</p>
            </div>
          )}
          <div className="absolute bottom-3 right-3 w-32 aspect-video rounded-xl overflow-hidden border-2 border-white/15 bg-slate-800">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {camOff && <div className="absolute inset-0 bg-slate-800 flex items-center justify-center"><VideoOff className="size-5 text-white/40" /></div>}
          </div>
        </div>

        {phase === "ringing" && <div className="h-4" />}

        <div className="relative z-10 flex items-center justify-center gap-6 px-6 pb-10">
          <div className="flex flex-col items-center gap-2">
            <button onClick={toggleMute}
              className={`size-14 rounded-full flex items-center justify-center transition-all ${muted ? "bg-red-500 shadow-red-500/30 shadow-lg" : "bg-white/10 hover:bg-white/20"}`}>
              {muted ? <MicOff className="size-5 text-white" /> : <Mic className="size-5 text-white" />}
            </button>
            <span className="text-white/40 text-[10px]">{muted ? "Unmute" : "Mute"}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button onClick={endCall}
              className="rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-xl shadow-red-500/40 hover:scale-105"
              style={{ width: 68, height: 68 }}>
              <PhoneOff className="size-7 text-white" />
            </button>
            <span className="text-white/40 text-[10px]">End Call</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button onClick={toggleCam}
              className={`size-14 rounded-full flex items-center justify-center transition-all ${camOff ? "bg-red-500 shadow-red-500/30 shadow-lg" : "bg-white/10 hover:bg-white/20"}`}>
              {camOff ? <VideoOff className="size-5 text-white" /> : <Video className="size-5 text-white" />}
            </button>
            <span className="text-white/40 text-[10px]">{camOff ? "Start cam" : "Camera"}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button onClick={toggleScreenShare}
              className={`size-14 rounded-full flex items-center justify-center transition-all ${screenSharing ? "bg-[#512feb] shadow-[#512feb]/30 shadow-lg" : "bg-white/10 hover:bg-white/20"}`}>
              {screenSharing ? <MonitorOff className="size-5 text-white" /> : <Monitor className="size-5 text-white" />}
            </button>
            <span className="text-white/40 text-[10px]">{screenSharing ? "Stop share" : "Share"}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
