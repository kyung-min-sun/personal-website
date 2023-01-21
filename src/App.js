// import logo from './logo.svg';
import './App.css';

function BlogPost(title, caption, date, previewText) {
  // some humble thoughts
  return (<div>
    <p className="Blog-post-title">
      {title}
    </p>
    <p className="Blog-caption">
      {caption} &#x2022; {date}
    </p>
    <p className="Blog-preview">
      {previewText}
    </p>
  </div>)
}

function App() {
  return (
    <div className="App">
      <div className="App-body">
        <p className="Blog-title">
          Some Humble Thoughts
        </p>
        {BlogPost(
          "Incredible Title", 
          "Incredible Caption",
          "Incredible Date",
          "Incredible Preview")
        }
      </div>
    </div>
  );
}

export default App;
