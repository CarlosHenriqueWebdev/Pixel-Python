import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Injectable,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputHandler } from './input-handler.service';
import { AudioPlayer } from './audio-player.service';
import { GameRenderer } from './game-renderer.service';
import { CommunicationService } from './communication.service';
import { GameLogic } from './game-logic.service';

@Component({
  selector: 'app-snake',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './snake.component.html',
  styleUrls: ['./snake.component.scss'],
  providers: [InputHandler, AudioPlayer, GameRenderer, GameLogic],
})
export class SnakeComponent implements OnInit, AfterViewInit {
  // View children references
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef;
  @ViewChild('snakeLength', { static: false }) snakeLengthElement!: ElementRef;
  @ViewChild('snakeLengthGameOver', { static: false })
  snakeLengthGameOverScore!: ElementRef;

  // Canvas context for drawing
  canvasContext!: CanvasRenderingContext2D;

  // Game configuration
  tileSize: number = 28;
  boardSize: { sizeX: number; sizeY: number } = {
    sizeX: 20,
    sizeY: 12,
  };
  boardRowsAmount = Array.from({ length: this.boardSize.sizeX });
  boardColumnsAmount = Array.from({ length: this.boardSize.sizeY });

  // Snake properties
  snakePlayer = [{ positionX: 0, positionY: 6 }];
  snakeDirection: { directionX: number; directionY: number } = {
    directionX: 1,
    directionY: 0,
  };

  // Food properties
  snakeFood: { positionX: number; positionY: number } = {
    positionX: 0,
    positionY: 0,
  };
  previousFoodPosition: { positionX: number; positionY: number } = {
    positionX: -1,
    positionY: -1,
  };

  // Game state and settings
  lastMoveTime: number = 0;
  moveInterval: number = 140;
  moveQueue: string[] = [];
  previousMove: string = '';
  isTheFirstMoveProcessed: boolean = true;
  targetScore: number = 0;
  highestScore: number = 0;
  isStartMenu: boolean = true;
  isGameRunning: boolean = false;
  isGameOver: boolean = false;
  isMuted: boolean = false;
  isAGameWin: boolean = false;
  lockControls: boolean = false;
  isPauseContainerVisible: boolean = false;
  countdownValue: number | null = 3;
  isCountdownRunning: boolean = false;
  winLength: number = 240;
  wasKeyboardEvent = true;
  contradictingMove: boolean = false;
  antiKeyHolding: boolean = false;
  fKeyPressed: boolean = false;
  didComponentLoad: boolean = false;

  // *Important Numbers
  STARTER_SNAKE_LENGTH: number = 3;
  FOOD_SNAKE_LENGTH_INCREASE_AMOUNT: number = 3;
  LOADING_SCREEN_DELAY_TIMER_MILISECONDS: number = 1400;
  COUNTDOWN_TIMER_SECONDS: number = 3; // The amount of seconds the countdown has
  COUNTDOWN_TIMER_DELAY_MILISECONDS: number = 1000; // The value of miliseconds until the countdown interval is over. Initial: 1000 = reduces 1 second of the timer every 1000 miliseconds
  REMOVE_STARTMENU_DELAYTIMER_MILISECONDS: number = 1000;
  STARTGAME_DELAY_TIMER_MILISECONDS: number = 3000;
  SHOW_GAMEOVER_SCREEN_AFTER_STOPGAME_DELAY_TIMER_MILISECONDS: number = 2400;
  RESTART_GAME_AFTER_EVENT_DELAY_TIMER_MILISECONDS: number = 100;

  constructor(
    private communicationService: CommunicationService<SnakeComponent>,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    private inputHandler: InputHandler,
    private audioPlayer: AudioPlayer,
    private gameLogic: GameLogic,
    private gameRenderer: GameRenderer
  ) {
    this.communicationService.setSnakeComponent(this);
  }

  ngOnInit(): void {
    // Ensure that SnakeComponent is ready
    this.inputHandler.ensureSnakeComponentInitialized();
    this.audioPlayer.ensureSnakeComponentInitialized();
    this.gameRenderer.ensureSnakeComponentInitialized();
    this.gameLogic.ensureSnakeComponentInitialized();

    setTimeout(() => {
      this.didComponentLoad = true;
    }, this.LOADING_SCREEN_DELAY_TIMER_MILISECONDS);

    this.gameLogic.initializeGame();
  }

  ngAfterViewInit(): void {
    this.initializeAfterViewInit();
  }

  private initializeAfterViewInit(): void {
    this.gameRenderer.setupToggleGameElementVisibilityWhileOnMenu();
    this.gameLogic.setupInitialSnakeScoreAndPreviousHighScore();

    this.lockControls = true;
    this.cdr.detectChanges(); // Trigger change detection
  }

  gameLoop(currentTime: number) {
    requestAnimationFrame(() => {
      this.gameLoop(performance.now());
    });

    if (!this.isGameRunning) {
      return;
    }

    const deltaTime = currentTime - this.lastMoveTime;

    if (deltaTime >= this.moveInterval) {
      this.gameLogic.moveSnake();
      this.lastMoveTime = currentTime;
      this.gameRenderer.drawTheGame();
    }
  }

  startGame() {
    this.gameLogic.startGame();
  }

  restartGame() {
    this.gameLogic.restartGame();
  }

  handleSpaceAndFKeyPress(keyBoardEvent: KeyboardEvent) {
    if (keyBoardEvent.key === 'f') {
      this.audioPlayer.toggleMute();
    }

    if (this.lockControls) {
      return;
    }

    if (keyBoardEvent.key === ' ') {
      this.gameRenderer.togglePauseContainerVisibilityAndToggleStopAndRunGame();
    }
  }

  handleKeyPress(keyBoardEvent: KeyboardEvent) {
    // Prevent default if it's a keyboard event, otherwise goes through if the trigger was a click event [from mobile]
    if (this.wasKeyboardEvent) {
      keyBoardEvent.preventDefault();
    }

    if (this.lockControls) {
      return;
    }

    this.inputHandler.processArrowKeyPress(keyBoardEvent.key);
    this.wasKeyboardEvent = true;
  }
}
