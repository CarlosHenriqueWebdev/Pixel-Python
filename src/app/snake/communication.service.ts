import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CommunicationService<T> {
  snakeComponent!: T;

  setSnakeComponent(snakeComponent: T): void {
    this.snakeComponent = snakeComponent;
  }

  getSnakeComponent(): T {
    return this.snakeComponent;
  }
}
