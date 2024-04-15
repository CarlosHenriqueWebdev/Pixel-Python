import { Component, Injectable } from '@angular/core';
import { Renderer2 } from '@angular/core';
import { CommunicationService } from './communication.service';
import { SnakeComponent } from './snake.component';

interface AudioPlayerInterface {
  ensureSnakeComponentInitialized(): void;
  toggleMute(): void;
  playSound(
    soundType: 'startGame' | 'snakeHit' | 'eatFood' | 'snakeMove'
  ): void;
}

@Injectable({
  providedIn: 'root',
})
export class AudioPlayer implements AudioPlayerInterface {
  private snakeComponent: any;

  constructor(
    private communicationService: CommunicationService<SnakeComponent>
  ) {}

  ensureSnakeComponentInitialized(): void {
    if (!this.snakeComponent) {
      this.snakeComponent = this.communicationService.getSnakeComponent();
    }
  }

  toggleMute(): void {
    // Toggle the mute state
    this.snakeComponent.isMuted = !this.snakeComponent.isMuted;

    this.updateMuteUI(); // Update UI immediately
    this.updateAudioVolume(); // Update audio volume immediately
  }

  // Update UI to reflect mute state
  private updateMuteUI(): void {
    const muteControl = document.querySelectorAll('.muteControl');

    if (this.snakeComponent.isMuted) {
      muteControl.forEach((muteControl) => {
        muteControl.classList.add('reduced-brightness');
      });
    } else {
      muteControl.forEach((muteControl) => {
        muteControl.classList.remove('reduced-brightness');
      });
    }
  }

  // Update audio volume based on mute state
  private updateAudioVolume(): void {
    const audioElements = document.querySelectorAll('audio');
    const mutedVolume = this.snakeComponent.isMuted ? 0 : 1;

    audioElements.forEach((individualAudio: HTMLAudioElement) => {
      individualAudio.volume = mutedVolume;
    });
  }

  playSound(
    soundType: 'startGame' | 'snakeHit' | 'eatFood' | 'snakeMove'
  ): void {
    if (!this.snakeComponent.isMuted) {
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
}
