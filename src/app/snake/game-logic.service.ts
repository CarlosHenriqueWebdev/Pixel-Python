import { Component, Injectable } from '@angular/core';
import { Renderer2 } from '@angular/core';
import { CommunicationService } from './communication.service';
import { SnakeComponent } from './snake.component';
import { AudioPlayer } from './audio-player.service';
import { InputHandler } from './input-handler.service';
import { GameRenderer } from './game-renderer.service';

interface GameLogicInterface {
  ensureSnakeComponentInitialized(): void;
  generateRandomCoordinates(): { positionX: number; positionY: number };
  initializeGame(): void;
  resetGameStates(): void;
  resetSnake(): void;
  restartGame(): void;
  setupInitialSnakeAndFood(): void;
  setupInitialSnakeScoreAndPreviousHighScore(): void;
  startGame(): void;
  stopGame(): void;
  updateFoodPosition(): void;
  updateSnakeLength(): void;
}

@Injectable({
  providedIn: 'root',
})
export class GameLogic implements GameLogicInterface {
  private snakeComponent: any;

  constructor(
    private renderer: Renderer2,
    private inputHandler: InputHandler,
    private audioPlayer: AudioPlayer,
    private gameRenderer: GameRenderer,
    private communicationService: CommunicationService<SnakeComponent>
  ) {}

  ensureSnakeComponentInitialized(): void {
    if (!this.snakeComponent) {
      this.snakeComponent = this.communicationService.getSnakeComponent();
    }
  }

  initializeGame(): void {
    // Add event listeners
    this.inputHandler.setupKeyBoardEventListeners();
    this.inputHandler.setupClickEventListeners();
    this.inputHandler.setupArrowClickEventListeners();
    this.setupInitialSnakeAndFood();

    // Initialize game logic
    this.snakeComponent.gameLoop(performance.now());
  }

  setupInitialSnakeAndFood(): void {
    for (
      let initialBodySegments: number = 0;
      initialBodySegments < this.snakeComponent.STARTER_SNAKE_LENGTH;
      initialBodySegments++
    ) {
      // Add 3 initial body segments to the snake
      this.snakeComponent.snakePlayer.push({
        ...this.snakeComponent.snakePlayer[
          this.snakeComponent.snakePlayer.length - 1
        ],
      });
    }

    // Render the initial snakeFood
    this.updateFoodPosition();
  }

  updateSnakeLength(): void {
    const currentSnakeLength = this.snakeComponent.snakePlayer.length;

    if (currentSnakeLength > this.snakeComponent.targetScore) {
      this.setNewAndUpdateDisplayedLength(currentSnakeLength);
      this.updateHighestScore(currentSnakeLength);
      this.applyClassBasedOnLength(currentSnakeLength);
    }
  }

  private setNewAndUpdateDisplayedLength(currentSnakeLength: number): void {
    // Get's the current length score
    const currentTargetScore = this.snakeComponent.targetScore;

    if (currentTargetScore < currentSnakeLength) {
      const newTargetScore = currentSnakeLength;

      // Replace's old length score on the HTML
      this.snakeComponent.snakeLengthElement.nativeElement.textContent =
        newTargetScore.toString();
      this.snakeComponent.snakeLengthGameOverScore.nativeElement.textContent =
        newTargetScore.toString();
    }
  }

  private updateHighestScore(currentSnakeLength: number): void {
    if (currentSnakeLength > this.snakeComponent.highestScore) {
      this.snakeComponent.highestScore = currentSnakeLength;
      localStorage.setItem(
        'snakeHighestScore',
        this.snakeComponent.highestScore.toString()
      );
    }
  }

  private applyClassBasedOnLength(currentSnakeLength: number): void {
    // Gives a class to the score if the snake reachs the win length
    if (currentSnakeLength >= this.snakeComponent.winLength) {
      const snakeIllustrations = document.querySelectorAll(
        '.snake-illustration'
      );

      snakeIllustrations.forEach((snakeIllustration: Element) => {
        this.renderer.addClass(snakeIllustration, 'increased-brightness');
      });
    }
  }

  moveSnake() {
    this.updateSnakeDirection();

    const newSnakeHead = this.calculateNewHeadPosition();

    // Quickly update the tail position so the head cannot hit it while the snake is moving itself
    this.updateTailPosition();

    // Check if the new head position is out of bounds or if it's inside the snake body
    if (
      this.isOutOfBounds(newSnakeHead) ||
      this.isSnakeBodyOverlap(newSnakeHead)
    ) {
      this.stopGame();
      return;
    }

    this.handleFoodInteraction(newSnakeHead);

    this.snakeComponent.snakePlayer[0] = newSnakeHead;
  }

  private updateSnakeDirection(): void {
    if (this.snakeComponent.moveQueue.length > 0) {
      const nextMove = this.snakeComponent.moveQueue.shift();

      if (this.snakeComponent.previousMove !== nextMove) {
        if (
          !this.snakeComponent.isTheFirstMoveProcessed &&
          !this.snakeComponent.contradictingMove
        ) {
          this.audioPlayer.playSound('snakeMove');
        }

        switch (nextMove) {
          case 'ArrowUp':
            if (this.snakeComponent.snakeDirection.directionY !== 1) {
              this.snakeComponent.snakeDirection.directionX = 0;
              this.snakeComponent.snakeDirection.directionY = -1;
            }
            break;
          case 'ArrowDown':
            if (this.snakeComponent.snakeDirection.directionY !== -1) {
              this.snakeComponent.snakeDirection.directionX = 0;
              this.snakeComponent.snakeDirection.directionY = 1;
            }
            break;
          case 'ArrowLeft':
            if (this.snakeComponent.snakeDirection.directionX !== 1) {
              this.snakeComponent.snakeDirection.directionX = -1;
              this.snakeComponent.snakeDirection.directionY = 0;
            }
            break;
          case 'ArrowRight':
            if (this.snakeComponent.snakeDirection.directionX !== -1) {
              this.snakeComponent.snakeDirection.directionX = 1;
              this.snakeComponent.snakeDirection.directionY = 0;
            }
            break;
        }
      }

      // Update the previous move, handling the undefined case
      this.snakeComponent.previousMove = nextMove!;
      this.snakeComponent.contradictingMove = false;
      this.snakeComponent.isTheFirstMoveProcessed = false;
    }
  }

  private calculateNewHeadPosition(): { positionX: number; positionY: number } {
    return {
      positionX:
        this.snakeComponent.snakePlayer[0].positionX +
        this.snakeComponent.snakeDirection.directionX,
      positionY:
        this.snakeComponent.snakePlayer[0].positionY +
        this.snakeComponent.snakeDirection.directionY,
    };
  }

  private isOutOfBounds(newSnakeHead: {
    positionX: number;
    positionY: number;
  }) {
    return (
      newSnakeHead.positionX < 0 ||
      newSnakeHead.positionX >= this.snakeComponent.boardSize.sizeX ||
      newSnakeHead.positionY < 0 ||
      newSnakeHead.positionY >= this.snakeComponent.boardSize.sizeY
    );
  }

  private isSnakeBodyOverlap(newSnakeHead: {
    positionX: number;
    positionY: number;
  }) {
    return this.snakeComponent.snakePlayer.some(
      (segment: any, index: any) =>
        index > 0 &&
        segment.positionX === newSnakeHead.positionX &&
        segment.positionY === newSnakeHead.positionY
    );
  }

  private updateTailPosition() {
    const tail = this.snakeComponent.snakePlayer.pop();

    // Update the tail position before moving the head
    if (tail) {
      this.snakeComponent.snakePlayer.unshift(tail);
    }
  }

  private handleFoodInteraction(newSnakeHead: {
    positionX: number;
    positionY: number;
  }) {
    // Check if the new head position is on the snakeFood
    if (
      this.snakeComponent.snakeFood.positionX === newSnakeHead.positionX &&
      this.snakeComponent.snakeFood.positionY === newSnakeHead.positionY
    ) {
      this.audioPlayer.playSound('eatFood');

      // Generate new snakeFood coordinates
      this.updateFoodPosition();

      for (
        let snakeFoodIncreaseAmount = 0;
        snakeFoodIncreaseAmount <
        this.snakeComponent.FOOD_SNAKE_LENGTH_INCREASE_AMOUNT;
        snakeFoodIncreaseAmount++
      ) {
        this.snakeComponent.snakePlayer.push({
          ...this.snakeComponent.snakePlayer[
            this.snakeComponent.snakePlayer.length - 1
          ],
        });
      }

      // Update the snake length initially
      this.updateSnakeLength();
    }
  }

  generateRandomCoordinates(): { positionX: number; positionY: number } {
    const availableCoordinates = this.getAvailableCoordinates();

    // No available coordinates
    if (availableCoordinates.length === 0) {
      return { positionX: -1, positionY: -1 }; // or handle this case differently
    }

    const randomIndex = Math.floor(Math.random() * availableCoordinates.length);
    return availableCoordinates[randomIndex];
  }

  // Get a available space on the board that the snake isn't occupying
  private getAvailableCoordinates() {
    const openSpaceCoordinates: Array<{
      positionX: number;
      positionY: number;
    }> = [];

    for (let x = 0; x < this.snakeComponent.boardSize.sizeX; x++) {
      for (let y = 0; y < this.snakeComponent.boardSize.sizeY; y++) {
        // Pushs only "if" the coordinated isn't occupied by any of the snake's body segments
        if (!this.isCoordinateOccupied(x, y)) {
          openSpaceCoordinates.push({ positionX: x, positionY: y });
        }
      }
    }

    return openSpaceCoordinates;
  }

  // Get's the current position of all of the snake segments
  private isCoordinateOccupied(x: number, y: number): boolean {
    return this.snakeComponent.snakePlayer.some(
      (segment: any) => segment.positionX === x && segment.positionY === y
    );
  }

  setupInitialSnakeScoreAndPreviousHighScore(): void {
    this.snakeComponent.targetScore = this.snakeComponent.snakePlayer.length;

    this.snakeComponent.snakeLengthElement.nativeElement.textContent =
      this.snakeComponent.targetScore.toString();

    this.snakeComponent.snakeLengthGameOverScore.nativeElement.textContent =
      this.snakeComponent.targetScore.toString();

    // Load the highest score from localStorage
    const storedHighestScore = localStorage.getItem('snakeHighestScore');
    if (storedHighestScore) {
      this.snakeComponent.highestScore = parseInt(storedHighestScore, 10);
    }
  }

  resetSnake(): void {
    // Reset the snake's body to contain only the head
    this.snakeComponent.snakePlayer.splice(1);

    // Reset the head position
    this.snakeComponent.snakePlayer[0] = { positionX: 1, positionY: 6 };

    // Add three additional segments to the snake's body
    for (let i = 0; i < this.snakeComponent.STARTER_SNAKE_LENGTH; i++) {
      this.snakeComponent.snakePlayer.push({
        ...this.snakeComponent.snakePlayer[
          this.snakeComponent.snakePlayer.length - 1
        ],
      });
    }

    this.snakeComponent.snakeDirection.directionX = 1;
    this.snakeComponent.snakeDirection.directionY = 0;

    this.updateSnakeLength();

    this.snakeComponent.moveQueue = [];
  }

  resetGameStates(): void {
    this.snakeComponent.isGameRunning = true;
    this.snakeComponent.isPauseContainerVisible = false;
    this.snakeComponent.targetScore = 0;
    this.snakeComponent.isGameOver = false;
    this.snakeComponent.lockControls = false;
    this.snakeComponent.isTheFirstMoveProcessed = true;
    this.snakeComponent.previousMove = '';
    this.snakeComponent.contradictingMove = false;

    const snakeIllustrations = document.querySelectorAll('.snake-illustration');
    const pauseContainerElement = document.querySelector('.pause-container');

    this.renderer.addClass(pauseContainerElement, 'hidden');
    snakeIllustrations.forEach((snakeIllustration: Element) => {
      this.renderer.removeClass(snakeIllustration, 'increased-brightness');
    });

    this.updateFoodPosition();

    // Add the initial move (right) to the moveQueue only if it's empty
    if (this.snakeComponent.moveQueue.length === 0) {
      this.snakeComponent.moveQueue.push('ArrowRight');
    }
  }

  updateFoodPosition(): void {
    const gameCanvas = this.snakeComponent.canvasRef.nativeElement;

    // Remove existing food element
    this.removeExistingFood(gameCanvas);
    this.setAndStoreNewFoodPosition();
    this.renderNewFoodElement(gameCanvas);
  }

  private removeExistingFood(gameCanvas: HTMLElement): void {
    const existingFood = gameCanvas.querySelector('.food');
    if (existingFood) {
      gameCanvas.removeChild(existingFood);
    }
  }

  private setAndStoreNewFoodPosition(): void {
    let newFoodPosition = this.generateRandomCoordinates();

    // This while will ensure that the new food position is not the same as the previous one
    while (
      this.snakeComponent.snakePlayer.some(
        (segment: any) =>
          segment.positionX === newFoodPosition.positionX &&
          segment.positionY === newFoodPosition.positionY
      ) ||
      (newFoodPosition.positionX ===
        this.snakeComponent.previousFoodPosition.positionX &&
        newFoodPosition.positionY ===
          this.snakeComponent.previousFoodPosition.positionY)
    ) {
      newFoodPosition = this.generateRandomCoordinates();
    }

    // Set the new food position
    this.snakeComponent.snakeFood = newFoodPosition;

    // Store the previous food position
    this.snakeComponent.previousFoodPosition = {
      ...this.snakeComponent.snakeFood,
    };
  }

  private renderNewFoodElement(gameCanvas: HTMLElement): void {
    // Render the new food element
    const foodElement = this.renderer.createElement('div');
    const nestedDiv = this.renderer.createElement('div');
    this.renderer.addClass(nestedDiv, 'nested-food');
    this.renderer.appendChild(foodElement, nestedDiv);

    this.renderer.addClass(foodElement, 'food');
    this.renderer.setStyle(
      foodElement,
      'left',
      `${
        this.snakeComponent.snakeFood.positionX * this.snakeComponent.tileSize
      }px`
    );
    this.renderer.setStyle(
      foodElement,
      'top',
      `${
        this.snakeComponent.snakeFood.positionY * this.snakeComponent.tileSize
      }px`
    );
    this.renderer.setStyle(
      foodElement,
      'width',
      `${this.snakeComponent.tileSize}px`
    );
    this.renderer.setStyle(
      foodElement,
      'height',
      `${this.snakeComponent.tileSize}px`
    );

    this.renderer.appendChild(gameCanvas, foodElement);
  }

  startGame(): void {
    this.gameRenderer.prepareStartGameMenuToClose();

    // Remove the Start Menu after X miliseconds for the animation to play properly
    setTimeout(() => {
      this.snakeComponent.isStartMenu = false;
    }, this.snakeComponent.REMOVE_STARTMENU_DELAYTIMER_MILISECONDS);

    // Start the game after a delay
    setTimeout(() => {
      this.gameRenderer.initializeGamePlay();
    }, this.snakeComponent.STARTGAME_DELAY_TIMER_MILISECONDS);
  }

  restartGame(): void {
    setTimeout(() => {
      this.resetGameStates();
      this.resetSnake();
    }, this.snakeComponent.RESTART_GAME_AFTER_EVENT_DELAY_TIMER_MILISECONDS);
  }

  stopGame(): void {
    this.snakeComponent.isGameRunning = false;
    this.snakeComponent.lockControls = true;
    this.audioPlayer.playSound('snakeHit');
    // Hides overlaping snake segments, such as the scenario where the snake eats food and then hits a wall, which would make it so the segments would stack over each other
    this.snakeComponent.gameRenderer.hideOverlappingSegments();
    this.snakeComponent.gameRenderer.giveClassToSnakeOnGameOver();

    setTimeout(() => {
      this.determineGameOutcome();
    }, this.snakeComponent.SHOW_GAMEOVER_SCREEN_AFTER_STOPGAME_DELAY_TIMER_MILISECONDS);
  }

  private determineGameOutcome(): void {
    this.snakeComponent.isGameOver = true;

    if (
      this.snakeComponent.snakePlayer.length >= this.snakeComponent.winLength
    ) {
      this.snakeComponent.isAGameWin = true;
    } else {
      this.snakeComponent.isAGameWin = false;
    }
  }
}
