import { Component, Injectable } from '@angular/core';
import { Renderer2 } from '@angular/core';
import { CommunicationService } from './communication.service';
import { SnakeComponent } from './snake.component';
import { AudioPlayer } from './audio-player.service';

interface GameRendererInterface {
  ensureSnakeComponentInitialized(): void;
  startCountdown(): void;
  initializeGamePlay(): void;
  drawTheGame(): void;
}

@Injectable({
  providedIn: 'root',
})
export class GameRenderer implements GameRendererInterface {
  private snakeComponent: any;

  constructor(
    private renderer: Renderer2,
    private audioPlayer: AudioPlayer,
    private communicationService: CommunicationService<SnakeComponent>
  ) {}

  ensureSnakeComponentInitialized(): void {
    if (!this.snakeComponent) {
      this.snakeComponent = this.communicationService.getSnakeComponent();
    }
  }

  startCountdown(): void {
    this.snakeComponent.lockControls = true;

    if (!this.snakeComponent.isCountdownRunning) {
      this.snakeComponent.isCountdownRunning = true;
      this.snakeComponent.countdownValue =
        this.snakeComponent.COUNTDOWN_TIMER_SECONDS; // Start countdown from X seconds

      // Start a countdown interval
      const countdownInterval = setInterval(() => {
        this.snakeComponent.countdownValue!--; // Decrement countdown value

        if (this.snakeComponent.countdownValue === 0) {
          clearInterval(countdownInterval); // Clear the interval when countdown reaches 0
          this.snakeComponent.countdownValue = null; // Reset countdown value
          this.snakeComponent.lockControls = false; // Unlock controls
        }
      }, this.snakeComponent.COUNTDOWN_TIMER_DELAY_MILISECONDS); // Update countdown every second
    }
  }

  setupToggleGameElementVisibilityWhileOnMenu(): void {
    const foodElementClass = document.querySelector('.food');

    if (this.snakeComponent.isStartMenu) {
      this.renderer.addClass(foodElementClass, 'hidden');
    } else {
      this.renderer.removeClass(foodElementClass, 'hidden');
    }
  }

  prepareStartGameMenuToClose(): void {
    // Add a class to startGameContainer to animate its exit
    const startGameContainer = document.querySelector('.start-game-container');

    this.renderer.addClass(startGameContainer, 'animated-menu-leave');

    this.audioPlayer.playSound('startGame'); // Play start game sound
    this.startCountdown(); // Start the countdown
  }

  initializeGamePlay(): void {
    this.snakeComponent.lastMoveTime = 0; // Reset last move time

    const removeFoodElementHiddenClass = () => {
      const foodElementClass = document.querySelector('.food');

      if (!this.snakeComponent.isStartMenu) {
        this.renderer.removeClass(foodElementClass, 'hidden');
      }
    };

    removeFoodElementHiddenClass(); // Show food element

    this.snakeComponent.isGameRunning = true; // Set game to running state

    // Add the initial move (right) to the moveQueue only if it's empty
    if (this.snakeComponent.moveQueue.length === 0) {
      this.snakeComponent.moveQueue.push('ArrowRight');
    }
  }

  drawTheGame(): void {
    if (!this.snakeComponent.isGameRunning) {
      return;
    }

    // Clear the previous snake from the boar
    this.clearSnakeFromCanvas();
    // Draw the new snake on the board
    this.drawSnakeOnCanvas();
  }

  private createSnakeSegment(): HTMLElement {
    const snakeSegment = this.renderer.createElement('div');
    const nestedDiv = this.renderer.createElement('div');

    this.renderer.addClass(nestedDiv, 'nested-snake-segment');
    this.renderer.appendChild(snakeSegment, nestedDiv);

    this.renderer.addClass(snakeSegment, 'snake-segment');
    this.renderer.setStyle(
      snakeSegment,
      'width',
      `${this.snakeComponent.tileSize}px`
    );
    this.renderer.setStyle(
      snakeSegment,
      'height',
      `${this.snakeComponent.tileSize}px`
    );

    return snakeSegment;
  }

  private setSnakePosition(element: HTMLElement, x: number, y: number): void {
    this.renderer.setStyle(
      element,
      'left',
      `${x * this.snakeComponent.tileSize}px`
    );
    this.renderer.setStyle(
      element,
      'top',
      `${y * this.snakeComponent.tileSize}px`
    );
  }

  private drawSnakeOnCanvas(): void {
    const gameCanvas = this.snakeComponent.canvasRef.nativeElement;

    this.snakeComponent.snakePlayer.forEach((segment: any) => {
      const snakeSegment = this.createSnakeSegment();
      this.setSnakePosition(snakeSegment, segment.positionX, segment.positionY);
      this.renderer.appendChild(gameCanvas, snakeSegment);
    });
  }

  private clearSnakeFromCanvas(): void {
    const gameCanvas = this.snakeComponent.canvasRef.nativeElement;

    // Remove all existing snake segments
    if (this.snakeComponent.isGameRunning) {
      const existingSegments = gameCanvas.querySelectorAll('.snake-segment');
      existingSegments.forEach((segment: HTMLElement) => {
        gameCanvas.removeChild(segment);
      });
    }
  }

  hideOverlappingSegments(): void {
    const gameCanvas = this.snakeComponent.canvasRef.nativeElement;
    const snakeSegments = gameCanvas.querySelectorAll('.snake-segment');

    snakeSegments.forEach((segment: any, index: any) => {
      // Skip adding hidden class to the first segment
      if (index === 0) {
        return;
      }

      const currentSegmentPosition = {
        x: this.snakeComponent.snakePlayer[index].positionX,
        y: this.snakeComponent.snakePlayer[index].positionY,
      };

      for (let i = index + 1; i < this.snakeComponent.snakePlayer.length; i++) {
        const nextSegmentPosition = {
          x: this.snakeComponent.snakePlayer[i].positionX,
          y: this.snakeComponent.snakePlayer[i].positionY,
        };

        if (
          currentSegmentPosition.x === nextSegmentPosition.x &&
          currentSegmentPosition.y === nextSegmentPosition.y
        ) {
          this.renderer.addClass(segment, 'hidden');
        }
      }
    });
  }

  giveClassToSnakeOnGameOver(): void {
    const gameCanvas = this.snakeComponent.canvasRef.nativeElement;

    const snakeSegments = gameCanvas.querySelectorAll(`.snake-segment`);

    snakeSegments.forEach((snakeSegment: Element) => {
      this.renderer.addClass(snakeSegment, 'blink');
    });

    setTimeout(() => {
      snakeSegments.forEach((snakeSegment: Element) => {
        this.renderer.removeClass(snakeSegment, 'blink');
      });
    }, this.snakeComponent.SHOW_GAMEOVER_SCREEN_AFTER_STOPGAME_DELAY_TIMER_MILISECONDS);
  }

  togglePauseContainerVisibilityAndToggleStopAndRunGame(): void {
    const pauseContainerElement = document.querySelector('.pause-container');
    const spaceBarControl = document.querySelectorAll('.spaceBarControl');

    if (!this.snakeComponent.isPauseContainerVisible) {
      spaceBarControl.forEach((spaceControl) => {
        spaceControl.classList.add('reduced-brightness');
      });

      this.renderer.removeClass(pauseContainerElement, 'hidden'); // Show pause container
      this.renderer.addClass(pauseContainerElement, 'bounceIn'); // Hide pause container
    } else {
      spaceBarControl.forEach((spaceControl) => {
        spaceControl.classList.remove('reduced-brightness');
      });
      this.renderer.addClass(pauseContainerElement, 'hidden'); // Hide pause container
      this.renderer.removeClass(pauseContainerElement, 'bounceIn'); // Show pause container
    }

    this.snakeComponent.isPauseContainerVisible =
      !this.snakeComponent.isPauseContainerVisible; // Toggle isPauseContainerVisible
    this.snakeComponent.isGameRunning = !this.snakeComponent.isGameRunning; // Toggle isGameRunning
  }
}
