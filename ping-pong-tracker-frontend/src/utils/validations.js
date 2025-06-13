export const required = value => 
  !value && value !== 0 ? 'This field is required' : undefined;

export const email = value =>
  value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)
    ? 'Invalid email address'
    : undefined;

export const minLength = min => value =>
  value && value.length < min
    ? `Must be at least ${min} characters`
    : undefined;

export const maxLength = max => value =>
  value && value.length > max
    ? `Must be ${max} characters or less`
    : undefined;

export const composeValidators = (...validators) => value =>
  validators.reduce((error, validator) => error || validator(value), undefined);
