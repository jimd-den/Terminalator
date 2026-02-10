import { TutorMessage } from '../../domain/entities/tutor/TutorMessage';

/**
 * SharedValue interface to avoid direct dependency on react-native-reanimated in logic.
 */
interface ISharedValue<T> {
  value: T;
}

/**
 * TutorPresenter - Interface Adapter Layer
 * 
 * Decouples domain messages from the Humble View.
 * Directly updates Reanimated SharedValues to avoid React re-renders.
 */
export class TutorPresenter {
  private visibility: ISharedValue<number>;
  private opacity: ISharedValue<number>;
  private currentMessage: TutorMessage | null = null;

  constructor(visibility: ISharedValue<number>, opacity: ISharedValue<number>) {
    this.visibility = visibility;
    this.opacity = opacity;
  }

  /**
   * Triggers the presentation of a message.
   * Directly updates SharedValues which will drive native animations.
   */
  public presentMessage(message: TutorMessage): void {
    this.currentMessage = message;
    
    // In a real implementation with Reanimated, we would use withTiming/withSpring here.
    // For the "Humble" logic, we just set the values. The View handles the animation mapping.
    this.visibility.value = 1;
    this.opacity.value = 1;
  }

  /**
   * Hides the Tutor overlay.
   */
  public dismiss(): void {
    this.visibility.value = 0;
    this.opacity.value = 0;
    this.currentMessage = null;
  }

  public getCurrentMessage(): TutorMessage | null {
    return this.currentMessage;
  }
}
