import { run } from "uebersicht";

const ISSUE_ID = "SF-118";
const API_KEY_COMMAND =
  'cat "$HOME/Library/Application Support/Übersicht/.linear-api-key" 2>/dev/null | tr -d \'[:space:]\'';

const QUERY = `
  query WeekPriorities($id: String!) {
    issue(id: $id) {
      identifier
      title
      url
      children(first: 20) {
        nodes {
          identifier
          title
          state {
            name
            type
          }
        }
      }
    }
  }
`;

export const refreshFrequency = 60 * 1000;

export const command = async (dispatch) => {
  try {
    const apiKey = (await run(API_KEY_COMMAND)).trim();

    if (!apiKey) {
      dispatch({
        type: "LOAD_FAILED",
        error:
          "Add your Linear API key to ~/Library/Application Support/Übersicht/.linear-api-key",
      });
      return;
    }

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { id: ISSUE_ID },
      }),
    });

    const json = await response.json();

    if (json.errors?.length) {
      dispatch({
        type: "LOAD_FAILED",
        error: json.errors[0].message || "Linear API error",
      });
      return;
    }

    dispatch({ type: "LOAD_SUCCEEDED", data: json.data.issue });
  } catch (error) {
    dispatch({ type: "LOAD_FAILED", error: String(error) });
  }
};

export const initialState = { loading: true };

export const updateState = (event, previousState) => {
  switch (event.type) {
    case "LOAD_SUCCEEDED":
      return { loading: false, issue: event.data, error: null };
    case "LOAD_FAILED":
      return {
        loading: false,
        error: event.error,
        issue: previousState.issue || null,
      };
    default:
      return previousState;
  }
};

const isDone = (stateType) =>
  stateType === "completed" || stateType === "canceled";

const statusSymbol = (stateType) => {
  if (stateType === "completed") return "✓";
  if (stateType === "started") return "◐";
  if (stateType === "canceled") return "×";
  return "○";
};

const openInLinear = (url) => {
  if (!url) return;
  run(`open ${JSON.stringify(url)}`);
};

const SCALE = 1.5;
const px = (value) => `${value * SCALE}px`;

export const className = `
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: ${px(320)};
  box-sizing: border-box;
  padding: ${px(14)} ${px(16)} ${px(12)};
  background: rgba(28, 28, 30, 0.82);
  -webkit-backdrop-filter: blur(${px(24)});
  color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
  font-size: ${px(12)};
  font-weight: 400;
  border: ${px(1)} solid rgba(255, 255, 255, 0.08);
  border-radius: ${px(12)};
  line-height: 1.4;
  box-shadow: 0 ${px(8)} ${px(24)} rgba(0, 0, 0, 0.28);

  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${px(8)};
    margin-bottom: ${px(10)};
  }

  .clickable {
    cursor: pointer;
  }

  .clickable:hover {
    opacity: 0.85;
  }

  .clickable:hover .title,
  .clickable:hover .meta,
  .task.clickable:hover .label {
    color: #64d2ff;
  }

  .title {
    font-size: ${px(13)};
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .meta {
    color: rgba(245, 245, 247, 0.55);
    font-size: ${px(11)};
    white-space: nowrap;
  }

  .tasks {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .task {
    display: flex;
    align-items: flex-start;
    gap: ${px(8)};
    padding: ${px(6)} 0;
  }

  .task + .task {
    border-top: ${px(1)} solid rgba(255, 255, 255, 0.06);
  }

  .status {
    width: ${px(14)};
    flex-shrink: 0;
    text-align: center;
    color: rgba(245, 245, 247, 0.45);
    font-size: ${px(11)};
    line-height: 1.45;
  }

  .status.done {
    color: #64d2ff;
  }

  .status.started {
    color: #ffd60a;
  }

  .label {
    flex: 1;
    color: rgba(245, 245, 247, 0.92);
  }

  .label.done {
    color: rgba(245, 245, 247, 0.45);
    text-decoration: line-through;
  }

  .state {
    color: rgba(245, 245, 247, 0.4);
    font-size: ${px(10)};
    margin-top: ${px(1)};
  }

  .empty,
  .error,
  .loading {
    color: rgba(245, 245, 247, 0.55);
    font-size: ${px(11)};
  }

  .error {
    color: #ff6b6b;
  }
`;

export const render = ({ loading, issue, error }) => {
  if (loading && !issue) {
    return <div className="loading">Loading weekly tasks…</div>;
  }

  if (error && !issue) {
    return <div className="error">{error}</div>;
  }

  const tasks = issue?.children?.nodes || [];
  const doneCount = tasks.filter((task) => isDone(task.state.type)).length;

  return (
    <div>
      <div
        className={`header ${issue?.url ? "clickable" : ""}`}
        onClick={() => openInLinear(issue?.url)}
      >
        <div className="title">{issue?.title || "Weekly tasks"}</div>
        <div className="meta">
          {issue?.identifier} · {doneCount}/{tasks.length}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="empty">No sub-issues yet.</div>
      ) : (
        <ul className="tasks">
          {tasks.map((task) => {
            const done = isDone(task.state.type);
            const started = task.state.type === "started";

            return (
              <li
                className={`task ${issue?.url ? "clickable" : ""}`}
                key={task.identifier}
                onClick={() => openInLinear(issue?.url)}
              >
                <span
                  className={`status ${done ? "done" : ""} ${started ? "started" : ""}`}
                >
                  {statusSymbol(task.state.type)}
                </span>
                <div>
                  <div className={`label ${done ? "done" : ""}`}>{task.title}</div>
                  <div className="state">{task.state.name}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error ? <div className="error">{error}</div> : null}
    </div>
  );
};
