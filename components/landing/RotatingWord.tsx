"use client"

import { useEffect, useState } from "react"

export default function RotatingWord({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % words.length), 2200)
    return () => clearInterval(id)
  }, [words.length])

  return (
    <span className="relative inline-grid">
      <span className="invisible" aria-hidden="true">
        {words.reduce((a, b) => (a.length > b.length ? a : b))}
      </span>
      {words.map((word, i) => (
        <span
          key={word}
          className={`col-start-1 row-start-1 bg-gradient-to-r from-[#7c5af5] to-[#512feb] bg-clip-text text-transparent transition-all duration-500 ${
            i === index ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
          }`}
        >
          {word}
        </span>
      ))}
    </span>
  )
}
