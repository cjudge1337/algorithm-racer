import { combineReducers } from 'redux';
import leaderboardReducer from './leaderboard_reducer';
import currentUserReducer from './current_user_reducer';

const rootReducer = combineReducers({
  leaderboardReducer,
  currentUserReducer
});

export default rootReducer;