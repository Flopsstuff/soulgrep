import { describe, expect, it } from 'vitest'

import { buildPersonaCorpus } from './persona-corpus.ts'

describe('buildPersonaCorpus', () => {
  it('uses root id as target and anonymizes speakers with symbols', () => {
    const input = {
      id: 116185284,
      messages: [
        {
          from_id: 'user116185284',
          text: '  hello   world  ',
        },
        {
          from_id: 'user999',
          text: 'ignore this',
        },
        {
          from_id: 'user116185284',
          text: '',
          media_type: 'animation',
          file: 'somefile',
        },
        {
          from_id: 'user116185284',
          text: [{ type: 'plain', text: 'array text' }],
        },
      ],
    }

    const chunks = buildPersonaCorpus(input, {
      minCharsPerChunk: 1,
      maxCharsPerChunk: 10_000,
      maxWordsPerChunk: 10_000,
      maxMessagesPerChunk: 100,
      dropShortMessages: false,
    })

    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toEqual({
      chunk_id: 'c000001',
      messages_count: 3,
      char_count: '> hello world\n< ignore this\n> array text'.length,
      word_count: 6,
      text: '> hello world\n< ignore this\n> array text',
    })
  })

  it('chunks by max chars and max messages without cutting messages', () => {
    const input = {
      id: 1,
      messages: [
        { from_id: 'user1', text: 'one' },
        { from_id: 'user2', text: 'two' },
        { from_id: 'user1', text: 'three' },
        { from_id: 'user2', text: 'four' },
      ],
    }

    const chunks = buildPersonaCorpus(input, {
      minCharsPerChunk: 1,
      maxCharsPerChunk: 12,
      maxWordsPerChunk: 100,
      maxMessagesPerChunk: 2,
      dropShortMessages: false,
    })

    expect(chunks).toHaveLength(3)
    expect(chunks.map((chunk) => chunk.text)).toEqual(['> one\n< two', '> three', '< four'])
    expect(chunks.map((chunk) => chunk.chunk_id)).toEqual(['c000001', 'c000002', 'c000003'])
  })

  it('drops short low-signal messages when enabled', () => {
    const input = {
      id: 1,
      messages: [
        { from_id: 'user1', text: 'ok' },
        { from_id: 'user2', text: 'ага' },
        { from_id: 'user1', text: '!!!' },
        { from_id: 'user2', text: 'normal phrase here' },
      ],
    }

    const chunks = buildPersonaCorpus(input, {
      minCharsPerChunk: 1,
      maxCharsPerChunk: 10_000,
      maxWordsPerChunk: 10_000,
      maxMessagesPerChunk: 100,
      dropShortMessages: true,
      minMessageLength: 4,
    })

    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toBe('< normal phrase here')
    expect(chunks[0].messages_count).toBe(1)
  })

  it('chunks by max words', () => {
    const input = {
      id: 1,
      messages: [
        { from_id: 'user1', text: 'one two three four' },
        { from_id: 'user2', text: 'alpha beta gamma delta' },
        { from_id: 'user1', text: 'last pair' },
      ],
    }

    const chunks = buildPersonaCorpus(input, {
      minCharsPerChunk: 1,
      maxCharsPerChunk: 10_000,
      maxWordsPerChunk: 8,
      maxMessagesPerChunk: 100,
      dropShortMessages: false,
    })

    expect(chunks).toHaveLength(2)
    expect(chunks[0].text).toBe('> one two three four\n< alpha beta gamma delta')
    expect(chunks[0].word_count).toBe(8)
    expect(chunks[1].text).toBe('> last pair')
    expect(chunks[1].word_count).toBe(2)
  })

  it('merges consecutive messages from same actor', () => {
    const input = {
      id: 1,
      messages: [
        { from_id: 'user1', text: 'first target' },
        { from_id: 'user1', text: 'second target' },
        { from_id: 'user2', text: 'first opponent' },
        { from_id: 'user2', text: 'second opponent' },
      ],
    }

    const chunks = buildPersonaCorpus(input, {
      minCharsPerChunk: 1,
      maxCharsPerChunk: 10_000,
      maxWordsPerChunk: 10_000,
      maxMessagesPerChunk: 100,
      dropShortMessages: false,
    })

    expect(chunks).toHaveLength(1)
    expect(chunks[0].messages_count).toBe(2)
    expect(chunks[0].text).toBe('> first target\nsecond target\n< first opponent\nsecond opponent')
  })
})
