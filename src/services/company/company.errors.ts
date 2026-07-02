import { AppError } from '@/middleware/error.middleware'

export class CompanyNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Company with id ${id} not found`)
    this.name = 'CompanyNotFoundError'
  }
}
