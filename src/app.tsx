import Example1 from './example1';
import Example2 from './example2';

function App() {
    return (
        <>
            <div className="info">
                <h1>Importer for AG Grid</h1>
                <p>
                    Allows users to import csv files to update existing rows or
                    add rows.
                </p>
            </div>

            <Example1 />

            <Example2 />

            <div className="footer">
                <div>
                    Made with ❤️ by <a href="/">Brian</a>.
                </div>
            </div>
        </>
    );
}

export default App;
