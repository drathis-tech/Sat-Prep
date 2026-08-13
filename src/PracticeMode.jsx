import { useState } from "react";
import { isAnswerCorrect, shuffle } from "./quizUtils";
import { renderMath } from "./renderMath";
import Calculator from "./Calculator";
import { useScreenFade } from "./useScreenFade";

function PracticeMode({ questionPool, title, subtitle }) {
  const triggerFade = useScreenFade();
  const [order, setOrder] = useState(() => shuffle(questionPool));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [freeResponse, setFreeResponse] = useState("");
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);

  const current = order[index];

  function handleSelectChoice(letter) {
    if (answered) return;
    setSelected(letter);
  }

  function handleCheckAnswer() {
    if (answered) return;

    const given = current.type === "multiple_choice" ? selected : freeResponse.trim();
    if (!given) return;

    const correct = isAnswerCorrect(current, given);
    setIsCorrect(correct);
    setAnswered(true);
    setAttemptedCount((c) => c + 1);
    if (correct) setCorrectCount((c) => c + 1);
  }

  function handleNextQuestion() {
    triggerFade("light", () => {
      const nextIndex = index + 1;
      if (nextIndex >= order.length) {
        setOrder(shuffle(questionPool));
        setIndex(0);
      } else {
        setIndex(nextIndex);
      }
      setSelected(null);
      setFreeResponse("");
      setAnswered(false);
      setIsCorrect(false);
    });
  }

  function handleRestart() {
    setOrder(shuffle(questionPool));
    setIndex(0);
    setSelected(null);
    setFreeResponse("");
    setAnswered(false);
    setIsCorrect(false);
    setCorrectCount(0);
    setAttemptedCount(0);
  }

  function handleFreeResponseKeyDown(e) {
    if (e.key === "Enter" && !answered) {
      handleCheckAnswer();
    }
  }

  return (
    <>
      <Calculator show={Boolean(current) && current.subject === "math"} />

      <div className="page-topbar">
        <span className="page-topbar-label">
          {title}
          {subtitle ? ` · ${subtitle}` : ""}
        </span>
        <span className="page-topbar-score">
          Score {correctCount}/{attemptedCount}
        </span>
      </div>

      {!current ? (
        <div className="question-card">
          <p className="question-text">No questions match this filter yet.</p>
        </div>
      ) : (
        <main className="question-card">
          <div className="question-meta">
            <span className="question-number">
              Question {index + 1} of {order.length}
            </span>
            <button className="restart-btn" onClick={handleRestart} type="button">
              Restart
            </button>
          </div>

          <p className="question-text">{renderMath(current.text)}</p>

          {current.image && (
            <div className="question-image-frame">
              <img
                className="question-image"
                src={`/question-images/${current.image}`}
                alt="Diagram for this question"
              />
            </div>
          )}

          {current.type === "multiple_choice" ? (
            <div className="choices">
              {current.choices.map((choice) => {
                const letter = choice.trim().charAt(0);
                const isSelected = selected === letter;
                const isCorrectChoice = letter === current.correctAnswer;

                let className = "choice-btn";
                if (answered) {
                  if (isCorrectChoice) className += " correct";
                  else if (isSelected && !isCorrectChoice) className += " incorrect";
                } else if (isSelected) {
                  className += " selected";
                }

                return (
                  <button
                    key={letter}
                    type="button"
                    className={className}
                    onClick={() => handleSelectChoice(letter)}
                    disabled={answered}
                  >
                    {renderMath(choice)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="free-response">
              <input
                type="text"
                className="free-response-input"
                placeholder="Type your answer"
                value={freeResponse}
                onChange={(e) => setFreeResponse(e.target.value)}
                onKeyDown={handleFreeResponseKeyDown}
                disabled={answered}
              />
            </div>
          )}

          {!answered ? (
            <button
              type="button"
              className="primary-btn"
              onClick={handleCheckAnswer}
              disabled={
                current.type === "multiple_choice" ? !selected : !freeResponse.trim()
              }
            >
              Check Answer
            </button>
          ) : (
            <div className="feedback-block">
              <div
                className={`feedback ${isCorrect ? "feedback-correct" : "feedback-incorrect"}`}
              >
                {isCorrect ? "Correct!" : `Incorrect. Correct answer: ${current.correctAnswer}`}
              </div>
              <div className="explanation">
                <strong>Explanation:</strong> {renderMath(current.explanation)}
              </div>
              <button type="button" className="primary-btn" onClick={handleNextQuestion}>
                Next Question
              </button>
            </div>
          )}
        </main>
      )}
    </>
  );
}

export default PracticeMode;
