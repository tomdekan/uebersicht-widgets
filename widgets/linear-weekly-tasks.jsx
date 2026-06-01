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
          project {
            name
            icon
            color
          }
          state {
            name
            type
          }
        }
      }
    }
    projects(first: 50) {
      nodes {
        name
        icon
        color
      }
    }
  }
`;

export const refreshFrequency = 30 * 1000;

export const command = async (dispatch) => {
  dispatch({ type: "REFRESH_START" });

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

    dispatch({
      type: "LOAD_SUCCEEDED",
      data: json.data.issue,
      projects: json.data.projects.nodes,
    });
  } catch (error) {
    dispatch({ type: "LOAD_FAILED", error: String(error) });
  }
};

export const initialState = { loading: true, refreshing: false };

export const updateState = (event, previousState) => {
  switch (event.type) {
    case "REFRESH_START":
      return {
        ...previousState,
        refreshing: Boolean(previousState.issue),
      };
    case "LOAD_SUCCEEDED":
      return {
        loading: false,
        refreshing: false,
        issue: event.data,
        projects: event.projects,
        error: null,
        updatedAt: Date.now(),
      };
    case "LOAD_FAILED":
      return {
        ...previousState,
        loading: false,
        refreshing: false,
        error: event.error,
        issue: previousState.issue || null,
      };
    default:
      return previousState;
  }
};

const STATE_ORDER = {
  started: 0,
  unstarted: 1,
  backlog: 2,
  completed: 3,
  canceled: 4,
};

const isDone = (stateType) =>
  stateType === "completed" || stateType === "canceled";

const PREFIX_TO_PROJECT = {
  CA: "Cain",
  CTG: "Coach Travel Group",
  CP: "Caterparts",
  CL: "Class Legal",
};

const stripTitlePrefix = (title) => {
  const match = title.match(/^[A-Za-z0-9]+:\s*(.+)$/);
  return match?.[1] || title;
};

const resolveProject = (task, projects) => {
  if (task.project?.name) return task.project;

  const prefix = task.title.match(/^([A-Za-z0-9]+):/)?.[1]?.toUpperCase();
  const projectName = prefix ? PREFIX_TO_PROJECT[prefix] : null;
  if (!projectName) return null;

  return (
    projects.find((project) => project.name === projectName) || {
      name: projectName,
      icon: null,
      color: "#bec2c8",
    }
  );
};

const sortTasks = (tasks, projects) =>
  [...tasks].sort((a, b) => {
    const orderA = STATE_ORDER[a.state.type] ?? 5;
    const orderB = STATE_ORDER[b.state.type] ?? 5;
    if (orderA !== orderB) return orderA - orderB;
    const projectA = resolveProject(a, projects)?.name || "";
    const projectB = resolveProject(b, projects)?.name || "";
    if (projectA !== projectB) return projectA.localeCompare(projectB);
    return a.title.localeCompare(b.title);
  });

const ProjectCubeIcon = ({ color }) => (
  <svg
    className="project-icon"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M8 2.5 13 5.5v5L8 13.5 3 10.5v-5L8 2.5Z"
      stroke={color}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M8 2.5v11M3 5.5 8 8l5-2.5"
      stroke={color}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

const ProjectTag = ({ project }) => {
  if (!project?.name) return null;

  const color = project.color || "#bec2c8";

  return (
    <span
      className="project-tag"
      style={{
        backgroundColor: `${color}22`,
        borderColor: `${color}44`,
      }}
    >
      {project.icon ? (
        <span className="project-icon">{project.icon}</span>
      ) : (
        <ProjectCubeIcon color={color} />
      )}
      <span className="project-name">{project.name}</span>
    </span>
  );
};

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

const formatUpdatedAt = (updatedAt) => {
  if (!updatedAt) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
};

const SCALE = 2.025;
const px = (value) => `${Math.round(value * SCALE)}px`;

export const className = `
  top: ${px(8)};
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  width: ${px(320)};
  box-sizing: border-box;
  padding: ${px(8)} ${px(10)} ${px(8)};
  background: rgba(28, 28, 30, 0.82);
  -webkit-backdrop-filter: blur(${px(24)});
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
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

  .meta.refreshing {
    color: rgba(100, 210, 255, 0.75);
  }

  .progress {
    height: ${px(3)};
    margin-bottom: ${px(10)};
    background: rgba(255, 255, 255, 0.08);
    border-radius: ${px(2)};
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: #64d2ff;
    border-radius: ${px(2)};
    transition: width 0.3s ease;
  }

  .tasks {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .task {
    display: flex;
    align-items: center;
    gap: ${px(8)};
    padding: ${px(10)} 0;
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
    min-width: 0;
    color: rgba(245, 245, 247, 0.92);
  }

  .label.done {
    color: rgba(245, 245, 247, 0.45);
    text-decoration: line-through;
  }

  .project-tag {
    display: inline-flex;
    align-items: center;
    gap: ${px(4)};
    flex-shrink: 0;
    max-width: ${px(130)};
    padding: ${px(2)} ${px(8)} ${px(2)} ${px(6)};
    border: ${px(1)} solid;
    border-radius: ${px(999)};
    line-height: 1.2;
  }

  .project-icon {
    display: inline-flex;
    flex-shrink: 0;
    font-size: ${px(10)};
    line-height: 1;
  }

  .project-name {
    overflow: hidden;
    color: rgba(245, 245, 247, 0.88);
    font-size: ${px(10)};
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
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

export const render = ({
  loading,
  refreshing,
  issue,
  projects = [],
  error,
  updatedAt,
}) => {
  if (loading && !issue) {
    return <div className="loading">Loading weekly tasks…</div>;
  }

  if (error && !issue) {
    return <div className="error">{error}</div>;
  }

  const tasks = sortTasks(issue?.children?.nodes || [], projects);
  const doneCount = tasks.filter((task) => isDone(task.state.type)).length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div>
      <div
        className={`header ${issue?.url ? "clickable" : ""}`}
        onClick={() => openInLinear(issue?.url)}
      >
        <div className="title">{issue?.title || "Weekly tasks"}</div>
        <div className={`meta ${refreshing ? "refreshing" : ""}`}>
          {issue?.identifier} · {doneCount}/{tasks.length}
          {updatedAt ? ` · ${formatUpdatedAt(updatedAt)}` : ""}
        </div>
      </div>

      {tasks.length > 0 ? (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <div className="empty">No sub-issues yet.</div>
      ) : (
        <ul className="tasks">
          {tasks.map((task) => {
            const done = isDone(task.state.type);
            const started = task.state.type === "started";
            const project = resolveProject(task, projects);
            const title = stripTitlePrefix(task.title);

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
                <ProjectTag project={project} />
                <div className={`label ${done ? "done" : ""}`}>{title}</div>
              </li>
            );
          })}
        </ul>
      )}

      {error ? <div className="error">{error}</div> : null}
    </div>
  );
};
