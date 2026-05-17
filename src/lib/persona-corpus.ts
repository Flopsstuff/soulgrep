export interface PersonaCorpusChunk {
  chunk_id: string
  messages_count: number
  char_count: number
  word_count: number
  text: string
}

export interface BuildPersonaCorpusOptions {
  minCharsPerChunk: number
  maxCharsPerChunk: number
  maxWordsPerChunk?: number
  maxMessagesPerChunk?: number
  dropShortMessages?: boolean
  minMessageLength?: number
  speakerFormat?: 'symbols' | 'roles'
}

interface RawEntityText {
  text?: string
}

interface RawMessage {
  from_id?: string
  text?: string | Array<string | RawEntityText>
}

interface RawChatExport {
  id?: number | string
  messages?: RawMessage[]
}

export type Side = 'outgoing' | 'incoming'

interface CleanMessage {
  speaker: Side
  text: string
}

export function buildPersonaCorpus(
  rawExport: RawChatExport,
  options: BuildPersonaCorpusOptions,
): PersonaCorpusChunk[] {
  const cleanedMessages = collectCleanMessages(rawExport, options)
  return chunkMessages(cleanedMessages, options)
}

function collectCleanMessages(
  rawExport: RawChatExport,
  options: BuildPersonaCorpusOptions,
): string[] {
  const ownerFromId = resolveOwnerFromId(rawExport)
  const speakerMarks = resolveSpeakerMarks(options.speakerFormat)
  const messages = rawExport.messages ?? []
  const result: CleanMessage[] = []

  for (const message of messages) {
    const rawText = extractText(message.text)
    const normalizedText = normalizeMessageText(stripLinksAndPhones(rawText))
    if (!normalizedText) {
      continue
    }

    if (shouldDropMessage(normalizedText, options)) {
      continue
    }

    const speaker: Side = message.from_id === ownerFromId ? 'outgoing' : 'incoming'
    const previous = result[result.length - 1]

    if (previous && previous.speaker === speaker) {
      previous.text = `${previous.text}\n${normalizedText}`
      continue
    }

    result.push({
      speaker,
      text: normalizedText,
    })
  }

  return result.map((message) => {
    const speakerPrefix =
      message.speaker === 'outgoing' ? speakerMarks.outgoingPrefix : speakerMarks.incomingPrefix
    return `${speakerPrefix} ${message.text}`
  })
}

function resolveOwnerFromId(rawExport: RawChatExport): string {
  if (rawExport.id === undefined || rawExport.id === null) {
    throw new Error('Root "id" is required in chat export')
  }

  const sourceId = String(rawExport.id).trim()
  if (!sourceId) {
    throw new Error('Root "id" cannot be empty')
  }

  return sourceId.startsWith('user') ? sourceId : `user${sourceId}`
}

export const SIDE_MARKERS: Record<Side, string> = {
  outgoing: '=>',
  incoming: '<=',
}

function resolveSpeakerMarks(format: BuildPersonaCorpusOptions['speakerFormat']): {
  outgoingPrefix: string
  incomingPrefix: string
} {
  if (format === 'roles') {
    return {
      outgoingPrefix: 'outgoing',
      incomingPrefix: 'incoming',
    }
  }

  return {
    outgoingPrefix: SIDE_MARKERS.outgoing,
    incomingPrefix: SIDE_MARKERS.incoming,
  }
}

function extractText(text: RawMessage['text']): string {
  if (typeof text === 'string') {
    return text
  }

  if (Array.isArray(text)) {
    return text
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }
        if (part && typeof part.text === 'string') {
          return part.text
        }
        return ''
      })
      .join('')
  }

  return ''
}

function shouldDropMessage(text: string, options: BuildPersonaCorpusOptions): boolean {
  if (!options.dropShortMessages) {
    return false
  }

  const minLength = options.minMessageLength ?? 3
  const hasLettersOrNumbers = /[\p{L}\p{N}]/u.test(text)
  if (!hasLettersOrNumbers) {
    return true
  }

  return text.length < minLength
}

function chunkMessages(
  messages: string[],
  options: BuildPersonaCorpusOptions,
): PersonaCorpusChunk[] {
  if (messages.length === 0) {
    return []
  }

  const maxWordsPerChunk = options.maxWordsPerChunk ?? 10_000
  const maxMessagesPerChunk = options.maxMessagesPerChunk ?? 1000
  const chunks: PersonaCorpusChunk[] = []

  let current: string[] = []
  let currentCharCount = 0
  let currentWordCount = 0

  for (const message of messages) {
    const messageWordCount = countWords(message)
    const separatorLength = current.length > 0 ? 1 : 0
    const nextCharCount = currentCharCount + separatorLength + message.length
    const wouldOverflowChars = current.length > 0 && nextCharCount > options.maxCharsPerChunk
    const wouldOverflowWords =
      current.length > 0 && currentWordCount + messageWordCount > maxWordsPerChunk
    const wouldOverflowMessages = current.length >= maxMessagesPerChunk

    if (wouldOverflowChars || wouldOverflowWords || wouldOverflowMessages) {
      chunks.push(buildChunk(chunks.length + 1, current))
      current = []
      currentCharCount = 0
      currentWordCount = 0
    }

    if (current.length > 0) {
      currentCharCount += 1
    }
    current.push(message)
    currentCharCount += message.length
    currentWordCount += messageWordCount

    if (
      currentCharCount >= options.minCharsPerChunk &&
      (currentCharCount >= options.maxCharsPerChunk ||
        currentWordCount >= maxWordsPerChunk ||
        current.length >= maxMessagesPerChunk)
    ) {
      chunks.push(buildChunk(chunks.length + 1, current))
      current = []
      currentCharCount = 0
      currentWordCount = 0
    }
  }

  if (current.length > 0) {
    chunks.push(buildChunk(chunks.length + 1, current))
  }

  return chunks
}

function buildChunk(index: number, messages: string[]): PersonaCorpusChunk {
  const text = messages.join('\n')
  const wordCount = messages.reduce((total, message) => total + countWords(message), 0)
  return {
    chunk_id: `c${String(index).padStart(6, '0')}`,
    messages_count: messages.length,
    char_count: text.length,
    word_count: wordCount,
    text,
  }
}

function normalizeMessageText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

function stripLinksAndPhones(text: string): string {
  const withoutLinks = text
    .replace(/\bhttps?:\/\/\S+/giu, ' ')
    .replace(/\bwww\.\S+/giu, ' ')
    .replace(/\bt\.me\/\S+/giu, ' ')

  return withoutLinks.replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, ' ')
}

function countWords(text: string): number {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return 0
  }

  const speakerMarkers = new Set(['=>', '<=', 'outgoing', 'incoming'])
  return speakerMarkers.has(tokens[0]) ? tokens.length - 1 : tokens.length
}
