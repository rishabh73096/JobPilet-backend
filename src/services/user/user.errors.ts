import { AppError } from '@/middleware/error.middleware'

export class UserNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `User with id ${id} not found`)
    this.name = 'UserNotFoundError'
  }
}

export class EmailAlreadyExistsError extends AppError {
  constructor(email: string) {
    super(409, `Email ${email} is already registered`)
    this.name = 'EmailAlreadyExistsError'
  }
}
