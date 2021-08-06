import msg from '@cdo/javalab/locale';
import {
  JavabuilderExceptionType,
  NeighborhoodExceptionType,
  SoundExceptionType,
  MediaExceptionType,
  TheaterExceptionType
} from './constants';

export function handleException(exceptionDetails, callback) {
  const type = exceptionDetails.value;
  const {connectionId, cause} =
    exceptionDetails.detail && exceptionDetails.detail;
  let error;
  switch (type) {
    // User initiated exceptions
    case JavabuilderExceptionType.ILLEGAL_METHOD_ACCESS:
      error = msg.illegalMethodAccess({cause: cause});
      break;
    case JavabuilderExceptionType.RUNTIME_ERROR:
      error = msg.runtimeError({cause: cause});
      break;
    case JavabuilderExceptionType.TWO_MAIN_METHODS:
      error = msg.twoMainMethods();
      break;
    case JavabuilderExceptionType.NO_MAIN_METHOD:
      error = msg.noMainMethod();
      break;
    case JavabuilderExceptionType.COMPILER_ERROR:
      error = msg.compilerError();
      break;
    case JavabuilderExceptionType.JAVA_EXTENSION_MISSING:
      error = msg.javaExtensionMissing();
      break;
    case JavabuilderExceptionType.CLASS_NOT_FOUND:
      error = msg.classNotFound();
      break;

    // Internal exceptions
    case JavabuilderExceptionType.INTERNAL_RUNTIME_EXCEPTION:
      error = msg.internalRuntimeException({connectionId: connectionId});
      break;
    case JavabuilderExceptionType.INTERNAL_COMPILER_EXCEPTION:
      error = msg.internalCompilerException({connectionId: connectionId});
      break;
    case JavabuilderExceptionType.INTERNAL_EXCEPTION:
      error = msg.internalException({connectionId: connectionId});
      break;

    // Neighborhood exceptions
    case NeighborhoodExceptionType.INVALID_GRID:
      error = msg.errorNeighborhoodInvalidGrid();
      break;
    case NeighborhoodExceptionType.INVALID_DIRECTION:
      error = msg.errorNeighborhoodInvalidDirection();
      break;
    case NeighborhoodExceptionType.GET_SQUARE_FAILED:
      error = msg.errorNeighborhoodGetSquareFailed();
      break;
    case NeighborhoodExceptionType.INVALID_COLOR:
      error = msg.errorNeighborhoodInvalidColor();
      break;
    case NeighborhoodExceptionType.INVALID_LOCATION:
      error = msg.errorNeighborhoodInvalidLocation();
      break;
    case NeighborhoodExceptionType.INVALID_MOVE:
      error = msg.errorNeighborhoodInvalidMove();
      break;
    case NeighborhoodExceptionType.INVALID_PAINT_LOCATION:
      error = msg.errorNeighborhoodInvalidPaintLocation();
      break;

    // Sound exceptions
    case SoundExceptionType.INVALID_AUDIO_FILE_FORMAT:
      error = msg.errorSoundInvalidAudioFileFormat();
      break;
    case SoundExceptionType.MISSING_AUDIO_DATA:
      error = msg.errorSoundMissingAudioData();
      break;

    // Media exceptions
    case MediaExceptionType.IMAGE_LOAD_ERROR:
      error = msg.errorMediaImageLoadError();
      break;

    // Theater exceptions
    case TheaterExceptionType.DUPLICATE_PLAY_COMMAND:
      error = msg.errorTheaterDuplicatePlayCommand();
      break;
    case TheaterExceptionType.INVALID_SHAPE:
      error = msg.errorTheaterInvalidShape();
      break;

    default:
      error = msg.unknownError({type, connectionId});
      break;
  }
  callback(error);
}
