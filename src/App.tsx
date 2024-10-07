import {useState} from 'react'
import './App.css'
import {getPreferences, getScores, getTopScorers, sortScores} from "./star.ts";


interface Vote {
  id: number;
  scores: Map<string, number>;
}

const INITIAL_VOTES: Vote[] = [
  {id: 1, scores: new Map([["O'Brien", 5], ["Murphy", 4], ["Walsh", 0], ["Kelly", 1]])},
  {id: 2, scores: new Map([["O'Brien", 5], ["Murphy", 2], ["Walsh", 1], ["Kelly", 0]])},
  {id: 3, scores: new Map([["O'Brien", 0], ["Murphy", 0], ["Walsh", 5], ["Kelly", 2]])},
  {id: 4, scores: new Map([["O'Brien", 2], ["Murphy", 5], ["Walsh", 2], ["Kelly", 0]])},
  {id: 5, scores: new Map([["O'Brien", 5], ["Murphy", 3], ["Walsh", 1], ["Kelly", 0]])},
];
const INITIAL_CANDIDATES = Array.from(INITIAL_VOTES[0].scores.keys());
const INITIAL_NEXT_ID = INITIAL_VOTES.map(vote => vote.id).reduce((previousId, id) => Math.max(previousId, id)) + 1;

// min & max scores (inclusive)
const MIN_SCORE = 0;
const MAX_SCORE = 5;

const GRADIENT_LEFT = [0xff, 0x00, 0x00];
const GRADIENT_RIGHT = [0x00, 0xff, 0x00];

function getColor(score: number) {
  const progress = (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
  const colorCodes = GRADIENT_LEFT.map((code, i) => {
    return Math.ceil((1 - progress) * code) +
    Math.ceil(progress * GRADIENT_RIGHT[i]);
  });
  return `#${colorCodes[0].toString(16).padStart(2, "0")}${colorCodes[1].toString(16).padStart(2, "0")}${colorCodes[2].toString(16).padStart(2, "0")}`;
}

const FIRST_CAN_BG_COLOR = "cyan"; // Color for first place (by score) candidate
const SECOND_CAN_BG_COLOR = "yellow"; // Color for second place (by score) candidate

function App() {
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [votes, setVotes] = useState(INITIAL_VOTES);
  const [newCandidate, setNewCandidate] = useState("");
  const [nextId, setNextId] = useState(INITIAL_NEXT_ID);

  const addVote = () => {
    setVotes(votes.concat({id: nextId, scores: new Map(candidates.map(candidate => [candidate, 0]))}));
    setNextId(nextId + 1);
  }

  const addCandidate = () => {
    if (candidates.includes(newCandidate) || newCandidate === "") {
      alert("New candidate name must be unique and non-empty");
      return;
    }
    setCandidates(candidates.concat(newCandidate));
    const newVotes = votes.map(vote => {
      const newScores = new Map(vote.scores.entries());
      newScores.set(newCandidate, 0);
      return {id: vote.id, scores: newScores};
    })
    setVotes(newVotes);
    setNewCandidate("");
  }

  const setScore = (id: number, candidate: string, score: number) => {
    const newVotes = votes.map(vote => {
      if (vote.id == id) {
        const newScores = new Map(vote.scores.entries());
        newScores.set(candidate, score);
        return {id: vote.id, scores: newScores};
      } else {
        return {id: vote.id, scores: vote.scores};
      }
    })
    setVotes(newVotes);
  }

  const deleteVote = (id: number) => {
    const newVotes = votes.filter((vote) => vote.id != id);
    setVotes(newVotes);
  }

  const deleteCandidate = (candidate: string) => {
    const newVotes = votes
        .map(({id, scores}) => { return {
          id: id,
          scores: Array.from(scores.entries())};
        })
        .map(({id, scores}) => { return {
          id: id,
          scores: new Map(scores.filter(([_candidate,]) => _candidate != candidate))
        };});
    setVotes(newVotes);

    const newCandidates = candidates.filter(_candidate => _candidate != candidate);
    setCandidates(newCandidates);
  }

  const totalScores = getScores(votes.map(vote => vote.scores));
  const sortedScores = sortScores(totalScores);
  const topCandidates = getTopScorers(sortedScores);

  // FIXME: We just assume there are no ties and run this on the first two scorers in the sorted list
  const [firstCandidate, secondCandidate] = topCandidates.slice(0, 2)
  const preferences = getPreferences(firstCandidate, secondCandidate, votes.map(vote => vote.scores));

  // FIXME: We should display an explanation/reason for victory or tie
  let winner = null;
  if (preferences.prefersFirst > preferences.prefersSecond) {
    winner = firstCandidate;
  } else if (preferences.prefersFirst < preferences.prefersSecond) {
    winner = secondCandidate;
  } else if (totalScores.get(firstCandidate) !== totalScores.get(secondCandidate)) {
    winner = firstCandidate;
  }

  return (
    <>
      <h1>STAR Voting</h1>
      <div className="card">
        <h2>Ballots</h2>
        <p>
          In a STAR election, each voter assigns a score to every candidate (customarily, on the inclusive range of zero
          to five). The winner of the election will be decided based on a combination of the summed total scores that
          each candidate wins, as well as each voter's implicit preferences between the top-scoring candidates, which
          can be inferred by their relative scoring of the candidates.
        </p>
        <p>
          Voters can assign any score within the allowed range to any number of candidates; voters can even assign
          the same score (e.g. 0 or 3) to every candidate; however, this would be pointless and equivalent to not
          voting.
        </p>
        <p>
          Voters are rewarded for giving their most-preferred candidates high scores and giving their least-preferred
          candidates low scores.
        </p>
        <table className="ballots">
          <thead>
          <tr>
            <th colSpan={2}></th>
            {candidates.map(candidate => <th key={candidate} className="candidate-delete" onClick={() => deleteCandidate(candidate)}>✖</th>)}
          </tr>
          <tr>
            <th></th>
            <th>ID</th>
            {candidates.map(candidate => <th className="candidate" key={candidate}>{candidate}</th>)}
          </tr>
          </thead>
          <tbody>
          {votes.map(vote => <tr className="ballot" key={vote.id}>
            <td className="vote-delete" onClick={() => {
              deleteVote(vote.id)
            }}>✖
            </td>
            <td>{vote.id}</td>
            {candidates.map(candidate => <td className="ballot" key={candidate}>
              <input className="score" style={{ backgroundColor: getColor(vote.scores.get(candidate) as number) }}
                     type="number" min={MIN_SCORE} max={MAX_SCORE} value={vote.scores.get(candidate)} onChange={(e) => {
                setScore(vote.id, candidate, parseInt(e.target.value))
              }}/>
            </td>)}
          </tr>)}
          <tr>
            <td colSpan={2} />
            <td colSpan={candidates.length} className="vote-add" onClick={addVote} style={{ fontSize: 18 }}><b>+</b></td>
          </tr>
          </tbody>
        </table>
      </div>
      <input type="text" value={newCandidate} onChange={(e) => setNewCandidate(e.target.value)}></input>
      <button onClick={addCandidate}>Add candidate</button>

      <h2>Score round</h2>
      {topCandidates.length == 2 && (<p>
        <b>{firstCandidate}</b> (score: <b>{totalScores.get(firstCandidate)}</b>)
        and <b>{secondCandidate}</b> (score: <b>{totalScores.get(secondCandidate)}</b>) received the two highest total scores.
        The winner will be decided by voters' preferences between these candidates.
      </p>)}
      <table>
        <thead><tr>
          <th>Candidate</th>
          <th>Total score</th>
        </tr></thead>
        <tbody>
          {sortedScores.map(([candidate, score]) => <tr>
            <td style={{backgroundColor: (candidate == firstCandidate && FIRST_CAN_BG_COLOR) || (candidate == secondCandidate && SECOND_CAN_BG_COLOR) || "gray"}}>{candidate}</td>
            <td>{score}</td>
          </tr>)}
        </tbody>
      </table>

      <h2>Run-off Round</h2>
      {(topCandidates.length == 2 && <>
        <table>
          <thead><tr>
            <th>ID</th>
            <th>{firstCandidate}</th>
            <th>{secondCandidate}</th>
            <th>Preference</th>
          </tr></thead>
          <tbody>
          {votes.map(vote => <tr>
            <td>{vote.id}</td>
            <td style={{ backgroundColor: getColor(vote.scores.get(firstCandidate)) }}>{vote.scores.get(firstCandidate)}</td>
            <td style={{ backgroundColor: getColor(vote.scores.get(secondCandidate)) }}>{vote.scores.get(secondCandidate)}</td>
            {
              (vote.scores.get(firstCandidate) > vote.scores.get(secondCandidate) && <td style={{ backgroundColor: FIRST_CAN_BG_COLOR }}>{firstCandidate}</td>) ||
              (vote.scores.get(firstCandidate) < vote.scores.get(secondCandidate) && <td style={{ backgroundColor: SECOND_CAN_BG_COLOR }}>{secondCandidate}</td>) ||
              <td style={{ backgroundColor: "gray"}}><i>neither</i></td>
            }
          </tr>)}
          </tbody>
        </table>
        <table>
        <thead>
          <tr>
            <th colSpan={3}>How many voters prefer:</th>
          </tr>
          <tr>
            <th>{firstCandidate}</th>
            <th><i>neither</i></th>
            <th>{secondCandidate}</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td>{preferences.prefersFirst}</td>
            <td>{preferences.noPreference}</td>
            <td>{preferences.prefersSecond}</td>
          </tr>
          </tbody>
        </table>
        <p>Winner: {winner !== null ? winner: <i>Tie</i>}</p>
      </>) || <>
        <i>Breaking ties in the scoring round is not yet supported in this app.</i>
      </>}
    </>
  )
}

export default App
