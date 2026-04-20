import type { AbstractControl, ValidationErrors } from '@angular/forms';

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

export function passwordPolicy(control: AbstractControl): ValidationErrors | null {
  return PASSWORD_RE.test(control.value ?? '') ? null : { passwordPolicy: true };
}
