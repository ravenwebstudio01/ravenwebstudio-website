import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { hashPassword, needsRehash, passwordProblems, verifyPassword } from '@/lib/auth/password'
import { MediaValidationError, processImage, sanitiseFileName } from '@/lib/media/process'

describe('password hashing', () => {
  it('hashes with scrypt and verifies', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash.startsWith('scrypt$131072$8$1$')).toBe(true)
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true)
    expect(await verifyPassword('wrong password here', hash)).toBe(false)
    expect(needsRehash(hash)).toBe(false)
  })

  it('uses a unique salt per hash', async () => {
    const a = await hashPassword('same password 123')
    const b = await hashPassword('same password 123')
    expect(a).not.toBe(b)
  })

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('x', 'md5$abc')).toBe(false)
    expect(needsRehash('scrypt$1024$8$1$a$b')).toBe(true)
  })

  it('enforces a sensible password policy', () => {
    expect(passwordProblems('short')).toHaveLength(1)
    expect(passwordProblems('password1234')).toContain('This password is too common.')
    expect(passwordProblems('ravenadmin-office-2026', { email: 'ravenadmin@studio.eu' })).toContain('Do not include your e-mail address.')
    expect(passwordProblems('a long and unusual passphrase')).toEqual([])
  })
})

describe('image processing', () => {
  it('re-encodes uploads as WebP variants without enlarging', async () => {
    const png = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#5546c8' } }).png().toBuffer()
    const result = await processImage(png, '00000000-0000-4000-8000-000000000000')
    expect(result.variants.map((v) => v.width)).toEqual([480, 960, 1200])
    for (const v of result.variants) {
      expect(v.key).toMatch(/^media\/00000000-0000-4000-8000-000000000000\/w\d+\.webp$/)
      const meta = await sharp(v.buffer).metadata()
      expect(meta.format).toBe('webp')
    }
    expect(result.width).toBe(1200)
    expect(result.height).toBe(800)
  })

  it('rejects SVG, non-images and oversize files', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    await expect(processImage(svg, '00000000-0000-4000-8000-000000000001')).rejects.toBeInstanceOf(MediaValidationError)
    await expect(processImage(Buffer.from('hello'), '00000000-0000-4000-8000-000000000002')).rejects.toBeInstanceOf(MediaValidationError)
    await expect(processImage(Buffer.alloc(5 * 1024 * 1024), '00000000-0000-4000-8000-000000000003')).rejects.toBeInstanceOf(MediaValidationError)
  })

  it('cleans file names', () => {
    expect(sanitiseFileName('../../etc/passwd')).toBe('passwd')
    expect(sanitiseFileName('C:\\Users\\me\\photo<1>.png')).toBe('photo1.png')
  })
})
