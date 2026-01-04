# llms-fetcher
📚 `npx` command which fetches the `llms.txt` files for all of your packages in `package.json`

```mermaid
flowchart TD
    A([package]) --> B{is there an 'llms'<br/>key in the<br/>'package.json'?}

    B -- yes --> FOUND([we've found it])
    B -- no --> C{is the package<br/>homepage a<br/>github link?}

    C -- yes --> D{does the github<br/>'readme.txt' mention<br/>the word 'docs' in a<br/>hyperlink?}
    C -- no --> E{does 'link/llms.txt'<br/>return a txt file?}

    D -- yes --> E
    D -- no --> NOFILE([there likely isn't a<br/>'llms.txt'<br/>for that package<br/><br/>Either use the 'README.txt',<br/>or use an external service<br/>like context7])

    E -- yes --> FOUND
    E -- no --> F{does 'link/docs/llms.txt'<br/>return a txt file?}

    F -- yes --> FOUND
    F -- no --> NOFILE
```
