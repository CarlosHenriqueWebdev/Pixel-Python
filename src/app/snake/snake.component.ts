import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-snake',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './snake.component.html',
  styleUrls: ['./snake.component.scss'],
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
  boardCollumsAmount = Array.from({ length: this.boardSize.sizeY });

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
  antiKeyHolding: boolean = false;
  fKeyPressed: boolean = false;

  constructor(private renderer: Renderer2, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeGame();
  }

  private initializeGame(): void {
    // Initialize game logic
    this.gameLoop(performance.now());

    // Set up keyboard event listeners
    const setupKeyBoardEventListeners = () => {
      // Listen for keydown events on the document
      this.renderer.listen(
        'document',
        'keydown',
        (keyBoardEvent: KeyboardEvent) => {
          this.handleKeyPress(keyBoardEvent); // Handle arrow key press

          if (!this.antiKeyHolding) {
            this.antiKeyHolding = true;

            this.handleSpaceAndFKeyPress(keyBoardEvent); // Handle spacebar and 'f' key press
          }
        }
      );

      this.renderer.listen(
        'document',
        'keyup',
        (keyBoardEvent: KeyboardEvent) => {
          if (this.antiKeyHolding) {
            this.antiKeyHolding = false;
          }
        }
      );
    };

    // Set up click event listeners
    const setupClickEventListeners = () => {
      const muteControl = document.querySelectorAll('.muteControl');
      muteControl.forEach((muteControl) => {
        // Listen for click events on muteControl elements
        muteControl.addEventListener('click', () => {
          this.handleSpaceAndFKeyPress({ key: 'f' } as KeyboardEvent);
        });
      });

      const spaceBarControl = document.querySelectorAll('.spaceBarControl');
      spaceBarControl.forEach((spaceControl) => {
        // Listen for click events on spaceBarControl elements
        spaceControl.addEventListener('click', () => {
          this.handleSpaceAndFKeyPress({ key: ' ' } as KeyboardEvent);
        });
      });
    };

    // Set up arrow click event listeners
    const setupArrowClickEventListeners = () => {
      const handleArrowClick = (key: string) => {
        this.wasKeyboardEvent = false;
        this.handleKeyPress({ key } as KeyboardEvent);
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
    };

    // Set up initial snake and food
    const setupInitialSnakeAndFood = () => {
      for (
        let initialBodySegments = 0;
        initialBodySegments < 3;
        initialBodySegments++
      ) {
        // Add 3 initial body segments to the snake
        this.snakePlayer.push({
          ...this.snakePlayer[this.snakePlayer.length - 1],
        });
      }

      // Render the initial snakeFood
      this.updateFoodPosition();
    };

    // Add event listeners
    setupKeyBoardEventListeners();
    setupClickEventListeners();
    setupInitialSnakeAndFood();
    setupArrowClickEventListeners();
  }

  ngAfterViewInit(): void {
    this.initializeAfterViewInit();
  }

  private initializeAfterViewInit(): void {
    this.lockControls = true;

    // Set up initial snake score and previous high score
    const setupInitialSnakeScoreAndPreviousHighScore = () => {
      this.targetScore = this.snakePlayer.length;
      this.snakeLengthElement.nativeElement.textContent =
        this.targetScore.toString();
      this.snakeLengthGameOverScore.nativeElement.textContent =
        this.targetScore.toString();

      // Load the highest score from localStorage
      const storedHighestScore = localStorage.getItem('snakeHighestScore');
      if (storedHighestScore) {
        this.highestScore = parseInt(storedHighestScore, 10);
      }
    };

    // Set up toggle game element visibility while on menu
    const setupToggleGameElementVisibilityWhileOnMenu = () => {
      const foodElementClass = document.querySelector('.food');

      if (this.isStartMenu) {
        this.renderer.addClass(foodElementClass, 'hidden');
      } else {
        this.renderer.removeClass(foodElementClass, 'hidden');
      }
    };

    setupToggleGameElementVisibilityWhileOnMenu();
    setupInitialSnakeScoreAndPreviousHighScore();

    this.cdr.detectChanges(); // Trigger change detection
  }

  toggleMute() {
    // Toggle the mute state
    this.isMuted = !this.isMuted;

    // Update UI to reflect mute state
    const updateMuteUI = () => {
      const muteControl = document.querySelectorAll('.muteControl');

      if (this.isMuted) {
        muteControl.forEach((muteControl) => {
          muteControl.classList.add('reduced-brightness');
        });
      } else {
        muteControl.forEach((muteControl) => {
          muteControl.classList.remove('reduced-brightness');
        });
      }
    };

    // Update audio volume based on mute state
    const updateAudioVolume = () => {
      const audioElements = document.querySelectorAll('audio');
      const mutedVolume = this.isMuted ? 0 : 1;

      audioElements.forEach((individualAudio: HTMLAudioElement) => {
        individualAudio.volume = mutedVolume;
      });
    };

    updateMuteUI(); // Update UI immediately
    updateAudioVolume(); // Update audio volume immediately
  }

  playSound(soundType: 'startGame' | 'snakeHit' | 'eatFood' | 'snakeMove') {
    if (!this.isMuted) {
      // Map sound types to corresponding audio element IDs
      const audioIdMap = {
        startGame: 'startGameAudio',
        snakeHit: 'snakeHitAudio',
        eatFood: 'eatFoodAudio',
        snakeMove: 'snakeMoveAudio',
      };

      const audioElement = document.getElementById(
        audioIdMap[soundType]
      ) as HTMLAudioElement | null;

      if (audioElement) {
        audioElement.volume = 0.5; // Set volume (0 to 1)
        audioElement.currentTime = 0; // Restart audioElement
        audioElement.play(); // Play the audio
      }
    }
  }

  startCountdown() {
    this.lockControls = true;

    if (!this.isCountdownRunning) {
      this.isCountdownRunning = true;
      this.countdownValue = 3; // Start countdown from 3 seconds

      // Start a countdown interval
      const countdownInterval = setInterval(() => {
        this.countdownValue!--; // Decrement countdown value

        if (this.countdownValue === 0) {
          clearInterval(countdownInterval); // Clear the interval when countdown reaches 0
          this.countdownValue = null; // Reset countdown value
          this.lockControls = false; // Unlock controls
        }
      }, 1000); // Update countdown every second
    }
  }

  startGame() {
    const prepareStartGameMenuToClose = () => {
      // Add a class to startGameContainer to animate its exit
      const startGameContainer = document.querySelector(
        '.start-game-container'
      );

      this.renderer.addClass(startGameContainer, 'animated-menu-leave');

      this.playSound('startGame'); // Play start game sound
      this.startCountdown(); // Start the countdown
    };

    prepareStartGameMenuToClose();

    // Remove the Start Menu after 1 second for the animation to play properly
    setTimeout(() => {
      this.isStartMenu = false;
    }, 1000);

    // Start the game after a delay
    setTimeout(() => {
      this.lastMoveTime = 0; // Reset last move time

      const removeFoodElementHiddenClass = () => {
        const foodElementClass = document.querySelector('.food');

        if (!this.isStartMenu) {
          this.renderer.removeClass(foodElementClass, 'hidden');
        }
      };

      removeFoodElementHiddenClass(); // Show food element

      this.isGameRunning = true; // Set game to running state

      // Add the initial move (right) to the moveQueue only if it's empty
      if (this.moveQueue.length === 0) {
        this.moveQueue.push('ArrowRight');
      }
    }, 3000); // Adjust the delay as needed
  }

  restartGame() {
    // Set isGameOver to false after a short delay to trigger class removal
    setTimeout(() => {
      const resetSnake = () => {
        // Reset the snake's body to contain only the head
        this.snakePlayer.splice(1);

        // Reset the head position
        this.snakePlayer[0] = { positionX: 1, positionY: 6 };

        // Add three additional segments to the snake's body
        for (let i = 0; i < 3; i++) {
          this.snakePlayer.push({
            ...this.snakePlayer[this.snakePlayer.length - 1],
          });
        }

        this.snakeDirection.directionX = 1;
        this.snakeDirection.directionY = 0;

        this.updateSnakeLength();

        this.moveQueue = [];
      };

      const resetGameStates = () => {
        this.isGameRunning = true;
        this.isPauseContainerVisible = false;
        this.targetScore = 0;
        this.isGameOver = false;
        this.lockControls = false;
        this.isTheFirstMoveProcessed = true;
        this.previousMove = '';

        const snakeIllustrations = document.querySelectorAll(
          '.snake-illustration'
        );
        const pauseContainerElement =
          document.querySelector('.pause-container');

        this.renderer.addClass(pauseContainerElement, 'hidden');
        snakeIllustrations.forEach((snakeIllustration: Element) => {
          this.renderer.removeClass(snakeIllustration, 'increased-brightness');
        });

        this.updateFoodPosition();

        // Add the initial move (right) to the moveQueue only if it's empty
        if (this.moveQueue.length === 0) {
          this.moveQueue.push('ArrowRight');
        }
      };

      resetGameStates();
      resetSnake();
    }, 100); // Adjust the delay as needed
  }

  updateSnakeLength() {
    const snakeLength = this.snakePlayer.length;

    if (snakeLength > this.targetScore) {
      // Start the animation
      let currentScore = this.targetScore;

      if (currentScore < snakeLength) {
        currentScore = snakeLength;

        this.snakeLengthElement.nativeElement.textContent =
          currentScore.toString();
        this.snakeLengthGameOverScore.nativeElement.textContent =
          currentScore.toString();
      }

      // Update the highest score if needed
      if (snakeLength > this.highestScore) {
        this.highestScore = snakeLength;
        localStorage.setItem('snakeHighestScore', this.highestScore.toString());
      }

      if (snakeLength >= this.winLength) {
        const snakeIllustrations = document.querySelectorAll(
          '.snake-illustration'
        );

        snakeIllustrations.forEach((snakeIllustration: Element) => {
          this.renderer.addClass(snakeIllustration, 'increased-brightness');
        });
      }
    }
  }

  generateRandomCoordinates(): { positionX: number; positionY: number } {
    const availableCoordinates = [];

    for (let x = 0; x < this.boardSize.sizeX; x++) {
      for (let y = 0; y < this.boardSize.sizeY; y++) {
        if (
          !this.snakePlayer.some(
            (segment) => segment.positionX === x && segment.positionY === y
          )
        ) {
          availableCoordinates.push({ positionX: x, positionY: y });
        }
      }
    }

    if (availableCoordinates.length === 0) {
      // No available coordinates
      return { positionX: -1, positionY: -1 }; // or handle this case differently
    }

    const randomIndex = Math.floor(Math.random() * availableCoordinates.length);
    return availableCoordinates[randomIndex];
  }

  drawTheGame() {
    if (!this.isGameRunning) {
      return;
    }

    this.clearCanvas();

    const gameCanvas = this.canvasRef.nativeElement;

    const createSnakeSegment = (): HTMLElement => {
      const snakeSegment = this.renderer.createElement('div');
      const nestedDiv = this.renderer.createElement('div');

      this.renderer.addClass(nestedDiv, 'nested-snake-segment');
      this.renderer.appendChild(snakeSegment, nestedDiv);

      this.renderer.addClass(snakeSegment, 'snake-segment');
      this.renderer.setStyle(snakeSegment, 'width', `${this.tileSize}px`);
      this.renderer.setStyle(snakeSegment, 'height', `${this.tileSize}px`);

      return snakeSegment;
    };

    const setPositionAndSize = (element: HTMLElement, x: number, y: number) => {
      this.renderer.setStyle(element, 'left', `${x * this.tileSize}px`);
      this.renderer.setStyle(element, 'top', `${y * this.tileSize}px`);
    };

    this.snakePlayer.forEach((segment) => {
      const snakeSegment = createSnakeSegment();
      setPositionAndSize(snakeSegment, segment.positionX, segment.positionY);
      this.renderer.appendChild(gameCanvas, snakeSegment);
    });
  }

  updateFoodPosition() {
    const gameCanvas = this.canvasRef.nativeElement;

    // Remove existing food element
    const existingFood = gameCanvas.querySelector('.food');
    if (existingFood) {
      gameCanvas.removeChild(existingFood);
    }

    let newFoodPosition = this.generateRandomCoordinates();

    // Ensure that the new food position is not the same as the previous one
    while (
      this.snakePlayer.some(
        (segment) =>
          segment.positionX === newFoodPosition.positionX &&
          segment.positionY === newFoodPosition.positionY
      ) ||
      (newFoodPosition.positionX === this.previousFoodPosition.positionX &&
        newFoodPosition.positionY === this.previousFoodPosition.positionY)
    ) {
      newFoodPosition = this.generateRandomCoordinates();
    }

    // Set the new food position
    this.snakeFood = newFoodPosition;

    // Store the previous food position
    this.previousFoodPosition = { ...this.snakeFood };

    const renderNewFoodElement = () => {
      // Render the new food element
      const foodElement = this.renderer.createElement('div');
      const nestedDiv = this.renderer.createElement('div');
      this.renderer.addClass(nestedDiv, 'nested-food');
      this.renderer.appendChild(foodElement, nestedDiv);

      this.renderer.addClass(foodElement, 'food');
      this.renderer.setStyle(
        foodElement,
        'left',
        `${this.snakeFood.positionX * this.tileSize}px`
      );
      this.renderer.setStyle(
        foodElement,
        'top',
        `${this.snakeFood.positionY * this.tileSize}px`
      );
      this.renderer.setStyle(foodElement, 'width', `${this.tileSize}px`);
      this.renderer.setStyle(foodElement, 'height', `${this.tileSize}px`);

      this.renderer.appendChild(gameCanvas, foodElement);
    };

    renderNewFoodElement();
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
      this.moveSnake();
      this.lastMoveTime = currentTime;
      this.drawTheGame();
    }
  }

  moveSnake() {
    if (this.moveQueue.length > 0) {
      const nextMove = this.moveQueue.shift();

      if (this.previousMove !== nextMove) {
        if (!this.isTheFirstMoveProcessed) {
          this.playSound('snakeMove');
        }

        switch (nextMove) {
          case 'ArrowUp':
            if (this.snakeDirection.directionY !== 1) {
              this.snakeDirection.directionX = 0;
              this.snakeDirection.directionY = -1;
            }
            break;
          case 'ArrowDown':
            if (this.snakeDirection.directionY !== -1) {
              this.snakeDirection.directionX = 0;
              this.snakeDirection.directionY = 1;
            }
            break;
          case 'ArrowLeft':
            if (this.snakeDirection.directionX !== 1) {
              this.snakeDirection.directionX = -1;
              this.snakeDirection.directionY = 0;
            }
            break;
          case 'ArrowRight':
            if (this.snakeDirection.directionX !== -1) {
              this.snakeDirection.directionX = 1;
              this.snakeDirection.directionY = 0;
            }
            break;
        }
      }

      // Update the previous move, handling the undefined case
      this.previousMove = nextMove!;
      this.isTheFirstMoveProcessed = false;
    }

    const newHead = {
      positionX: this.snakePlayer[0].positionX + this.snakeDirection.directionX,
      positionY: this.snakePlayer[0].positionY + this.snakeDirection.directionY,
    };

    // Check if the new head position is out of bounds
    if (
      newHead.positionX < 0 ||
      newHead.positionX >= this.boardSize.sizeX ||
      newHead.positionY < 0 ||
      newHead.positionY >= this.boardSize.sizeY
    ) {
      this.stopGame();
      return;
    }

    // Store the previous tail position
    const tail = this.snakePlayer.pop();

    // Update the tail position before moving the head
    if (tail) {
      this.snakePlayer.unshift(tail);
    }

    // Check if the new head position overlaps with any existing segment in the snake's body
    if (
      this.snakePlayer.some(
        (segment, index) =>
          index > 0 &&
          segment.positionX === newHead.positionX &&
          segment.positionY === newHead.positionY
      )
    ) {
      this.stopGame();
      return;
    }

    // Check if the new head position is on the snakeFood
    if (
      this.snakeFood.positionX === newHead.positionX &&
      this.snakeFood.positionY === newHead.positionY
    ) {
      this.playSound('eatFood');

      // Generate new snakeFood coordinates
      this.updateFoodPosition();

      for (
        let snakeFoodIncreaseAmount = 0;
        snakeFoodIncreaseAmount < 3;
        snakeFoodIncreaseAmount++
      ) {
        this.snakePlayer.push({
          ...this.snakePlayer[this.snakePlayer.length - 1],
        });
      }

      // Update the snake length initially
      this.updateSnakeLength();
    }

    this.snakePlayer[0] = newHead;
  }

  checkForOverlappingSegments() {
    const gameCanvas = this.canvasRef.nativeElement;
    const snakeSegments = gameCanvas.querySelectorAll('.snake-segment');

    snakeSegments.forEach((segment: any, index: any) => {
      const currentSegmentPosition = {
        x: this.snakePlayer[index].positionX,
        y: this.snakePlayer[index].positionY,
      };

      for (let i = index + 1; i < this.snakePlayer.length; i++) {
        const nextSegmentPosition = {
          x: this.snakePlayer[i].positionX,
          y: this.snakePlayer[i].positionY,
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

  clearCanvas() {
    const gameCanvas = this.canvasRef.nativeElement;

    // Remove all existing snake segments
    if (this.isGameRunning) {
      const existingSegments = gameCanvas.querySelectorAll('.snake-segment');
      existingSegments.forEach((segment: HTMLElement) => {
        gameCanvas.removeChild(segment);
      });
    }
  }

  stopGame() {
    this.playSound('snakeHit');

    this.isGameRunning = false;
    this.lockControls = true;

    this.checkForOverlappingSegments();

    const gameCanvas = this.canvasRef.nativeElement;

    const snakeSegments = gameCanvas.querySelectorAll(`.snake-segment`);

    snakeSegments.forEach((snakeSegment: Element) => {
      this.renderer.addClass(snakeSegment, 'blink');
    });

    setTimeout(() => {
      this.isGameOver = true;

      if (this.snakePlayer.length >= this.winLength) {
        this.isAGameWin = true;
      } else {
        this.isAGameWin = false;
      }

      snakeSegments.forEach((snakeSegment: Element) => {
        this.renderer.removeClass(snakeSegment, 'blink');
      });
    }, 2400);
  }

  handleSpaceAndFKeyPress(keyBoardEvent: KeyboardEvent) {
    console.log();
    if (keyBoardEvent.key === 'f') {
      this.toggleMute();
    }

    if (this.lockControls) {
      return;
    }

    if (keyBoardEvent.key === ' ') {
      const pauseContainerElement = document.querySelector('.pause-container');
      const spaceBarControl = document.querySelectorAll('.spaceBarControl');

      if (!this.isPauseContainerVisible) {
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

      this.isPauseContainerVisible = !this.isPauseContainerVisible; // Toggle isPauseContainerVisible
      this.isGameRunning = !this.isGameRunning; // Toggle isGameRunning
    }
  }

  handleKeyPress(keyBoardEvent: KeyboardEvent) {
    if (this.wasKeyboardEvent) {
      keyBoardEvent.preventDefault();
    }

    if (this.lockControls) {
      return;
    }

    switch (keyBoardEvent.key) {
      case 'ArrowUp':
      case 'w':
        if (
          this.moveQueue[this.moveQueue.length - 1] !==
            ('ArrowUp' && 'ArrowDown') &&
          this.previousMove !== 'ArrowDown'
        ) {
          this.moveQueue.push('ArrowUp');
        }
        break;
      case 'ArrowDown':
      case 's':
        if (
          this.moveQueue[this.moveQueue.length - 1] !==
            ('ArrowDown' && 'ArrowUp') &&
          this.previousMove !== 'ArrowUp'
        ) {
          this.moveQueue.push('ArrowDown');
        }
        break;
      case 'ArrowLeft':
      case 'a':
        if (
          this.moveQueue[this.moveQueue.length - 1] !==
            ('ArrowLeft' && 'ArrowRight') &&
          this.previousMove !== 'ArrowRight'
        ) {
          this.moveQueue.push('ArrowLeft');
        }
        break;
      case 'ArrowRight':
      case 'd':
        if (
          this.moveQueue[this.moveQueue.length - 1] !==
            ('ArrowRight' && 'ArrowLeft') &&
          this.previousMove !== 'ArrowLeft'
        ) {
          this.moveQueue.push('ArrowRight');
        }
        break;
    }

    this.wasKeyboardEvent = true;
  }
}
