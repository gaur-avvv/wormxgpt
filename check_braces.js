const fs = require('fs');
const content = fs.readFileSync('c:/Users/Dell/Desktop/wormgpt-deployment/services/tools.ts', 'utf8');

function checkBraces(text) {
    let stack = [];
    let lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '{') {
                stack.push({ line: i + 1, char: j + 1 });
            } else if (line[j] === '}') {
                if (stack.length === 0) {
                    console.log(`Unmatched closing brace at line ${i + 1}, char ${j + 1}`);
                } else {
                  stack.pop();
                }
            }
        }
    }
    if (stack.length > 0) {
        console.log(`Unmatched opening braces: ${stack.length}`);
        for (let s of stack.slice(0, 5)) {
           console.log(`Unmatched opening brace at line ${s.line}, char ${s.char}: ${lines[s.line-1].trim().substring(0, 50)}`);
        }
    } else {
        console.log("Braces are balanced.");
    }
}

checkBraces(content);
