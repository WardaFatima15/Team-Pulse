"use client"

import { useEffect, useState } from "react"

const WORDS = ["your sales pipeline", "client proposals", "offshore teams", "daily updates", "PlugAI audits"]

/** Types each word out character by character, holds, deletes, moves to the next — with a block cursor. */
export default function TypeCycle() {
  const [text, setText] = useState("")
  const [wordIdx, setWordIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = WORDS[wordIdx]
    let delay: number

    if (!deleting && text === word) {
      delay = 1800 // hold the full word
    } else if (deleting && text === "") {
      delay = 300
    } else {
      delay = deleting ? 34 : 58
    }

    const id = setTimeout(() => {
      if (!deleting && text === word) {
        setDeleting(true)
      } else if (deleting && text === "") {
        setDeleting(false)
        setWordIdx(i => (i + 1) % WORDS.length)
      } else {
        setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1))
      }
    }, delay)

    return () => clearTimeout(id)
  }, [text, deleting, wordIdx])

  return (
    <span className="whitespace-nowrap">
      <span className="text-white">{text}</span>
      <span className="caret-blink -mb-1 ml-1 inline-block h-[0.95em] w-[0.5em] align-baseline bg-[#7c5af5]" />
    </span>
  )
}
