import { ValidatorFn, Validators } from '@angular/forms';

export const NAME_MAX_LENGTH = 30;

export const participantNameValidators: ValidatorFn[] = [
  Validators.required,
  Validators.pattern(/\S/),
  Validators.maxLength(NAME_MAX_LENGTH),
];
