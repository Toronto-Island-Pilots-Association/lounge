import { stripFormatting, stripMentionFormat, mentionsToEmailHtml } from '@/lib/utils'

describe('lib/utils', () => {
  describe('stripMentionFormat', () => {
    it('replaces @[Name](id) with @Name', () => {
      expect(stripMentionFormat('Hi @[Jane Doe](user-123)!')).toBe('Hi @Jane Doe!')
      expect(stripMentionFormat('@[Admin](abc) and @[Bob](def)')).toBe('@Admin and @Bob')
    })

    it('leaves text without mentions unchanged', () => {
      expect(stripMentionFormat('No mentions here')).toBe('No mentions here')
    })
  })

  describe('stripFormatting', () => {
    it('strips @mentions to @Name', () => {
      expect(stripFormatting('Reply to @[Alice](id-1)')).toBe('Reply to @Alice')
    })

    it('strips HTML tags', () => {
      expect(stripFormatting('<p>Hello</p>')).toBe('Hello')
      expect(stripFormatting('a <script>x</script> b')).toBe('a x b')
    })

    it('strips markdown bold and italic', () => {
      expect(stripFormatting('**bold** and *italic*')).toBe('bold and italic')
      expect(stripFormatting('__bold__ and _italic_')).toBe('bold and italic')
    })

    it('strips markdown links to link text only', () => {
      expect(stripFormatting('[click here](https://example.com)')).toBe('click here')
    })

    it('strips backticks', () => {
      expect(stripFormatting('Use `code` here')).toBe('Use code here')
    })

    it('trims result', () => {
      expect(stripFormatting('  **x**  ')).toBe('x')
    })
  })

  describe('mentionsToEmailHtml', () => {
    it('wraps @[Name](id) in styled span for email', () => {
      expect(mentionsToEmailHtml('Hi @[Jane](user-1)!')).toContain('@Jane')
      expect(mentionsToEmailHtml('Hi @[Jane](user-1)!')).toContain('#1264a3')
      expect(mentionsToEmailHtml('Hi @[Jane](user-1)!')).not.toContain('user-1')
    })

    it('leaves non-mention text unchanged', () => {
      const text = 'Plain text'
      expect(mentionsToEmailHtml(text)).toBe(text)
    })
  })
})
