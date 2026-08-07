import {
  channelDetail,
  channelKind,
  friendlyChannelLabel,
} from './public-content'

describe('friendlyChannelLabel', () => {
  it('leaves a real name alone', () => {
    expect(friendlyChannelLabel('Instagram', 'https://instagram.com/ubl')).toBe(
      'Instagram',
    )
  })

  it('names the platform when the label is its own address', () => {
    // The first thing an operator did: paste the address into both fields. The
    // page must not print HTTPS://WWW.INSTAGRAM.COM/... as a name.
    expect(
      friendlyChannelLabel(
        'https://www.instagram.com/ushuaiabeerleague/',
        'https://www.instagram.com/ushuaiabeerleague/',
      ),
    ).toBe('Instagram')
  })

  it('shows the address itself for a mail channel', () => {
    expect(
      friendlyChannelLabel(
        'mailto:ushuaiabl@gmail.com',
        'mailto:ushuaiabl@gmail.com',
      ),
    ).toBe('ushuaiabl@gmail.com')
  })

  it('falls back to the hostname for a place it does not know', () => {
    expect(
      friendlyChannelLabel(
        'https://tierradelfuego.gob.ar/x',
        'https://tierradelfuego.gob.ar/x',
      ),
    ).toBe('tierradelfuego.gob.ar')
  })
})

describe('channelKind', () => {
  it('recognises the destinations the site draws icons for', () => {
    // The first Instagram row shipped wearing two beer mugs: the icon comes
    // from the address, never from whatever emoji an operator typed.
    expect(channelKind('https://www.instagram.com/ushuaiabeerleague/')).toBe(
      'instagram',
    )
    expect(channelKind('mailto:liga@example.com')).toBe('mail')
    expect(channelKind('https://wa.me/15550100')).toBe('whatsapp')
    expect(channelKind('https://facebook.com/ubl')).toBe('facebook')
  })

  it('answers null for anything it does not recognise', () => {
    expect(channelKind('https://ubl.com.ar/fotos')).toBeNull()
    expect(channelKind('not a url at all')).toBeNull()
  })
})

describe('channelDetail', () => {
  it('shows the handle for a profile and the address for a mail', () => {
    // "Instagram" alone does not say which account; the card prints it.
    expect(channelDetail('https://www.instagram.com/ushuaiabeerleague/')).toBe(
      '@ushuaiabeerleague',
    )
    expect(channelDetail('mailto:liga@example.com')).toBe('liga@example.com')
  })

  it('shows the hostname for an ordinary link', () => {
    expect(channelDetail('https://www.example.com/algo')).toBe('example.com')
  })

  it('never prints the phone number a WhatsApp link carries', () => {
    expect(channelDetail('https://wa.me/15550100')).toBeNull()
  })

  it('answers nothing for an address it cannot parse', () => {
    expect(channelDetail('not a url at all')).toBeNull()
  })
})
