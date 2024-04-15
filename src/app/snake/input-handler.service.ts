import { Component, Injectable } from '@angular/core';
import { Renderer2 } from '@angular/core';
import { CommunicationService } from './communication.service';
import { SnakeComponent } from './snake.component';

interface InputHandlerInterface {
  ensureSnakeComponentInitialized(): void;
  setupKeyBoardEventListeners(): void;
  setupClickEventListeners(): void;
  setupArrowClickEventListeners(): void;
  processArrowKeyPress(keyBoardEvent: string): void;
}

@Injectable({
  providedIn: 'root',
})
export class InputHandler implements InputHandlerInterface {
  private snakeComponent: any;

  constructor(
    private renderer: Renderer2,
    private communicationService: CommunicationService<SnakeComponent>
  ) {}

  ensureSnakeComponentInitialized(): void {
    if (!this.snakeComponent) {
      this.snakeComponent = this.communicationService.getSnakeComponent();
    }
  }

  setupKeyBoardEventListeners(): void {
    // Listen for keydown events on the document
    this.renderer.listen(
      'document',
      'keydown',
      (keyBoardEvent: KeyboardEvent) => {
        this.snakeComponent.handleKeyPress(keyBoardEvent); // Handle arrow key press

        if (!this.snakeComponent.antiKeyHolding) {
          this.snakeComponent.antiKeyHolding = true;

          this.snakeComponent.handleSpaceAndFKeyPress(keyBoardEvent); // Handle spacebar and 'f' key press
        }
      }
    );

    this.renderer.listen(
      'document',
      'keyup',
      (keyBoardEvent: KeyboardEvent) => {
        if (this.snakeComponent.antiKeyHolding) {
          this.snakeComponent.antiKeyHolding = false;
        }
      }
    );
  }

  setupClickEventListeners(): void {
    const muteControl = document.querySelectorAll('.muteControl');
    muteControl.forEach((muteControl) => {
      // Listen for click events on muteControl elements
      muteControl.addEventListener('click', () => {
        this.snakeComponent.handleSpaceAndFKeyPress({
          key: 'f',
        } as KeyboardEvent);
      });
    });

    const spaceBarControl = document.querySelectorAll('.spaceBarControl');
    spaceBarControl.forEach((spaceControl) => {
      // Listen for click events on spaceBarControl elements
      spaceControl.addEventListener('click', () => {
        this.snakeComponent.handleSpaceAndFKeyPress({
          key: ' ',
        } as KeyboardEvent);
      });
    });
  }

  setupArrowClickEventListeners(): void {
    const handleArrowClick = (key: string) => {
      this.snakeComponent.wasKeyboardEvent = false;
      this.snakeComponent.handleKeyPress({ key } as KeyboardEvent);
    };

    const arrowIds = ['downArrow', 'upArrow', 'leftArrow', 'rightArrow'];
    arrowIds.forEach((arrowID) => {
      const arrowElement = document.getElementById(arrowID);

      arrowElement!.addEventListener('click', () => {
        switch (arrowID) {
          case 'downArrow':
            handleArrowClick('ArrowDown');
            break;
          case 'upArrow':
            handleArrowClick('ArrowUp');
            break;
          case 'leftArrow':
            handleArrowClick('ArrowLeft');
            break;
          case 'rightArrow':
            handleArrowClick('ArrowRight');
            break;
        }
      });
    });
  }

  processArrowKeyPress(keyBoardEvent: string): void {
    switch (keyBoardEvent) {
      case 'ArrowUp':
      case 'w':
        if (
          this.snakeComponent.moveQueue[
            this.snakeComponent.moveQueue.length - 1
          ] !== ('ArrowUp' && 'ArrowDown')
        ) {
          if (this.snakeComponent.previousMove === 'ArrowDown') {
            this.snakeComponent.contradictingMove = true;
          }

          this.snakeComponent.moveQueue.push('ArrowUp');
        }
        break;
      case 'ArrowDown':
      case 's':
        if (
          this.snakeComponent.moveQueue[
            this.snakeComponent.moveQueue.length - 1
          ] !== ('ArrowDown' && 'ArrowUp')
        ) {
          if (this.snakeComponent.previousMove === 'ArrowUp') {
            this.snakeComponent.contradictingMove = true;
          }
          this.snakeComponent.moveQueue.push('ArrowDown');
        }
        break;
      case 'ArrowLeft':
      case 'a':
        if (
          this.snakeComponent.moveQueue[
            this.snakeComponent.moveQueue.length - 1
          ] !== ('ArrowLeft' && 'ArrowRight')
        ) {
          if (this.snakeComponent.previousMove === 'ArrowRight') {
            this.snakeComponent.contradictingMove = true;
          }
          this.snakeComponent.moveQueue.push('ArrowLeft');
        }
        break;
      case 'ArrowRight':
      case 'd':
        if (
          this.snakeComponent.moveQueue[
            this.snakeComponent.moveQueue.length - 1
          ] !== ('ArrowRight' && 'ArrowLeft')
        ) {
          if (this.snakeComponent.previousMove === 'ArrowLeft') {
            this.snakeComponent.contradictingMove = true;
          }
          this.snakeComponent.moveQueue.push('ArrowRight');
        }
        break;
    }
  }
}
