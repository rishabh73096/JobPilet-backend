import { AppError } from '@/middleware/error.middleware'

export class ApplicationNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Application with id ${id} not found`)
    this.name = 'ApplicationNotFoundError'
  }
}
