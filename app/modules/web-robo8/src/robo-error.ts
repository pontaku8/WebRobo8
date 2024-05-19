export class RoboError extends Error
{
  errors: object
  constructor(init :Partial<RoboError>) 
  {
    super()
    this.errors = init.errors?? {}
  }
}