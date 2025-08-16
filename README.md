# Family Map: A React Flow Proof-of-Concept

This project is an interactive family tree and relationship graph builder, created as a proof-of-concept using React and the powerful React Flow library. It provides a simple, intuitive interface for visualizing family structures, including partnerships and parent-child relationships.

![Family Map Screenshot](/assets/images/screenExample.png)

## ✨ Features

- **Add & Edit People**: Easily add new individuals to the map and edit their details (name, birth/death dates, gender).
- **Visual Relationship Linking**: Create unions/marriages by simply dragging a connection from one person to another.
- **Parent-Child Relationships**: Add children to a union by dragging from the union's node to a person.
- **Smart Layouts**:
    - **Auto-Layout**: Automatically arranges nodes in a clean top-down hierarchy.
    - **Friendly Layout**: A custom, less aggressive layout mode that keeps family groups tightly packed and avoids unnecessary stretching, making the map feel more natural and intuitive.
- **Undo/Redo**: Full support for undoing and redoing actions, from adding a person to changing the layout.
- **Export/Import**: Save your family map as a JSON file to your local machine and import it back later. You can even choose a custom filename!
- **Modern UI**: A clean, Apple-inspired design with a side panel for editing, clear iconography, and smooth interactions.

## 🛠️ Tech Stack

- **UI Framework**: [React](https://reactjs.org/)
- **Graph Rendering**: [React Flow](https://reactflow.dev/)
- **Automated Layout**: [@dagrejs/dagre](https://github.com/dagrejs/dagre)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Testing**: [Vitest](https://vitest.dev/) & [React Testing Library](https://testing-library.com/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/family-map-poc.git
    cd family-map-poc
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or the next available port).

## Usage

- **Add a Person**: Click the "Add Person" button or the floating action button (`+`) in the corner.
- **Edit a Person**: Click on any person's node to open the editor in the side panel.
- **Create a Union**: Drag a line from one person node to another. A "union" node (represented by a ring icon on a line) will appear between them.
- **Add a Child**: Drag a line from a union node to a person node. This establishes that person as a child of that union.
- **Change Layout**: Use the single "Auto-layout" button to reflow the graph (Top→Bottom only).
- **Toggle Friendly Mode**: Switch between the standard Dagre layout and the custom "Friendly" layout for a more compact view.

## License

### Notes / Changelog

- Left→Right layout option was removed to focus on clarity; the app now standardizes on a top-down family tree, which tested better for readability.

This project is open-source and available under the [MIT License](LICENSE).
