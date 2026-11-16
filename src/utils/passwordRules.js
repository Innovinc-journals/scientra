// Backend password rule: 8-128 characters, with an uppercase letter, a digit and a special character.
export const PASSWORD_HINT =
  'Use 8-128 characters with an uppercase letter, a number and a special character.'

export function validatePassword(password, confirm) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return 'Password must be 8-128 characters.'
  }
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.'
  if (!/\d/.test(password)) return 'Password must include a number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a special character.'
  if (confirm !== undefined && password !== confirm) return 'Passwords do not match.'
  return null
}
