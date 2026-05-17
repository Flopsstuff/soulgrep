#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { buildPersonaCorpus } from '../src/lib/persona-corpus.ts'

async function main() {
  const args = parseArgs(process.argv.slice(2))
  validateArgs(args)

  const sourcePath = path.resolve(process.cwd(), args.input)

  const rawJson = await readFile(sourcePath, 'utf8')
  const rawExport = JSON.parse(rawJson)

  const chunks = buildPersonaCorpus(rawExport, {
    minCharsPerChunk: args.minCharsPerChunk,
    maxCharsPerChunk: args.maxCharsPerChunk,
    maxWordsPerChunk: args.maxWordsPerChunk,
    maxMessagesPerChunk: args.maxMessagesPerChunk,
    dropShortMessages: args.dropShortMessages,
    minMessageLength: args.minMessageLength,
    speakerFormat: args.speakerFormat,
  })

  const targetId = normalizeTargetId(rawExport.id)
  const outputPath = path.resolve(process.cwd(), args.output || `data/clean/chat-${targetId}.jsonl`)
  await mkdir(path.dirname(outputPath), { recursive: true })
  for (const chunk of chunks) {
    process.stdout.write(
      `${JSON.stringify({
        chunk_id: chunk.chunk_id,
        messages_count: chunk.messages_count,
        char_count: chunk.char_count,
        word_count: chunk.word_count,
      })}\n`,
    )
  }

  await writeFile(
    outputPath,
    `${chunks.map((chunk) => JSON.stringify(chunk)).join('\n')}${chunks.length > 0 ? '\n' : ''}`,
    'utf8',
  )

  process.stdout.write(
    `Saved ${chunks.length} chunks for target "${targetId}" to ${path.relative(
      process.cwd(),
      outputPath,
    )}\n`,
  )
}

function parseArgs(argv) {
  const defaults = {
    input: 'data/samples/result.json',
    output: '',
    minCharsPerChunk: 4000,
    maxCharsPerChunk: 100_000,
    maxWordsPerChunk: 10_000,
    maxMessagesPerChunk: 3000,
    dropShortMessages: false,
    minMessageLength: 3,
    speakerFormat: 'symbols',
  }

  const args = { ...defaults }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]

    if (token === '--input') {
      args.input = argv[++i] ?? args.input
    } else if (token === '--output') {
      args.output = argv[++i] ?? args.output
    } else if (token === '--min-chars') {
      args.minCharsPerChunk = Number(argv[++i] ?? args.minCharsPerChunk)
    } else if (token === '--max-chars') {
      args.maxCharsPerChunk = Number(argv[++i] ?? args.maxCharsPerChunk)
    } else if (token === '--max-words') {
      args.maxWordsPerChunk = Number(argv[++i] ?? args.maxWordsPerChunk)
    } else if (token === '--max-messages') {
      args.maxMessagesPerChunk = Number(argv[++i] ?? args.maxMessagesPerChunk)
    } else if (token === '--drop-short-messages') {
      args.dropShortMessages = true
    } else if (token === '--min-message-length') {
      args.minMessageLength = Number(argv[++i] ?? args.minMessageLength)
    } else if (token === '--speaker-format') {
      args.speakerFormat = argv[++i] ?? args.speakerFormat
    } else if (token === '--help') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${token}`)
    }
  }

  return args
}

function validateArgs(args) {
  if (!Number.isFinite(args.minCharsPerChunk) || args.minCharsPerChunk < 1) {
    throw new Error('--min-chars must be a positive number')
  }
  if (!Number.isFinite(args.maxCharsPerChunk) || args.maxCharsPerChunk < args.minCharsPerChunk) {
    throw new Error('--max-chars must be >= --min-chars')
  }
  if (!Number.isFinite(args.maxWordsPerChunk) || args.maxWordsPerChunk < 1) {
    throw new Error('--max-words must be a positive number')
  }
  if (!Number.isFinite(args.maxMessagesPerChunk) || args.maxMessagesPerChunk < 1) {
    throw new Error('--max-messages must be a positive number')
  }
  if (!Number.isFinite(args.minMessageLength) || args.minMessageLength < 1) {
    throw new Error('--min-message-length must be a positive number')
  }
  if (args.speakerFormat !== 'symbols' && args.speakerFormat !== 'roles') {
    throw new Error('--speaker-format must be "symbols" or "roles"')
  }
}

function normalizeTargetId(rawId) {
  if (rawId === undefined || rawId === null) {
    throw new Error('Root "id" is required in chat export')
  }

  const source = String(rawId).trim()
  if (!source) {
    throw new Error('Root "id" cannot be empty')
  }

  return source.startsWith('user') ? source.slice(4) : source
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/build-persona-corpus.mjs [options]

Options:
  --input <path>               Input Telegram export JSON (default: samples/result.json)
  --output <path>              Output JSONL path (default: data/clean/chat-<id>.jsonl)
  --min-chars <number>         Min chars per chunk (default: 4000)
  --max-chars <number>         Max chars per chunk (default: 100000)
  --max-words <number>         Max words per chunk (default: 10000)
  --max-messages <number>      Max messages per chunk (default: 1000)
  --speaker-format <value>     "symbols" (> / <) or "roles" (default: symbols)
  --drop-short-messages        Drop low-signal short messages (default: false)
  --min-message-length <num>   Min length when drop short is enabled (default: 3)
`)
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
