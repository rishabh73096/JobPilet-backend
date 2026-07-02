import { AppError } from '@/middleware/error.middleware'

export class EmailNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Email with id ${id} not found`)
    this.name = 'EmailNotFoundError'
  }
}
