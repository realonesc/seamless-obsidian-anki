import {
	App,
	Editor,
	MarkdownView,
} from "obsidian";

import { Properties } from "src/entities/properties";
import { Block, Line } from "src/entities/block";

export class Parser {
	private app: App;

	private editor: Editor;

	public deep = "hi";
	private matches: string[] = [];

	// https://regex101.com/r/OIZEIQ/3
	// https://regex101.com/r/a1AtGP/2
	// https://regex101.com/r/a1AtGP/3
	// https://regex101.com/r/Ov7ysu/1
	// https://regex101.com/r/Ov7ysu/2
	// https://regex101.com/r/x56wYj/1

	private pattern = /(.+?)(>>)(.*?)((%%.*?anki\((.*?)\).*?%%)(.*)|$)/gmi;

	// https://regex101.com/r/kixTYa/1
	// https://regex101.com/r/c57qt7/2

	private propertyPattern = /(([^\s]+?)(?:=)(".+?"|.+?)|.+?)(?:\s|$)/ig
	
	private text: string;
	private lines: string[];

	constructor(app: App) {
		this.app = app;
	}

	public async getBlocks() : Promise<Block[]> {
		const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
		const blocks: Block[] = [];
		const editor = view.editor;

		this.text = editor.getValue();
		this.lines = this.text.split("\n");

		const pattern = this.pattern;


		let match = pattern.exec(this.text);
		
		// runs the code inside of the brackets for each line. they are all line numbers!!
		// inline functions dont work but arrow ones do
		this.matchingLines(this.text, pattern).forEach((lineNumber: number, index: number) => {
			match = pattern.exec(this.text);

			for (let i = 0; i < match.length; i++) {
				if (match[i] == null) match[i] = ""; 
			}

			const block = new Block(lineNumber, new Line(lineNumber, editor.getLine(lineNumber)));
			block.itemParents = this.findLineParents(editor, block.line, 2);
			block.descriptor = match[1];
			block.value = match[3];
			block.properties = this.getProperties(match[6]);
			blocks.push(block);
		});
		return blocks;
	}

	private getLine(lineNumber: number) : Line {
		return new Line(lineNumber, this.lines[lineNumber]);
	}

	private findLineParents(editor: Editor, line: Line, maxParents: number) : Line[] {

		const parents = [];
		
		//bulletLevel = this.getBulletLevel(editor.getLine(lineNumber));

		// For bullets!
		let topBulletLevel = line.bulletLevel; //remember, larger number means smaller level.
		for (let i = line.lineNumber; i > 1; i--)
		{
			if (parents.length >= maxParents) break;
			const _line = this.getLine(i - 1)
			if (_line.bulletLevel < topBulletLevel) {
				topBulletLevel = _line.bulletLevel;
				parents.push(_line);
			}
		}
		console.log(parents);
		return parents;
	}


	private matchingLines(text: string, pattern: RegExp): number[] {
		const matchingLines = [];
		const allLines = text.split("\n");
	
		for (let i = 0; i < allLines.length; i++) {
			if (allLines[i].match(pattern)) {
				matchingLines.push(i);
			}
		}
	
		return matchingLines;
	}

	public getSubStrings(text: string): string[] {
		const substrings: string[] = [];

		const match = this.pattern.exec(text);
		for (let i = 0; i < match.length; i++) {
			if (match[i] == null) match[i] = ""; 
			substrings.push(match[i]);
		}
		return substrings;
	}

	public getProperties(text: string): Properties {
		let match: RegExpExecArray = this.propertyPattern.exec(text);
		
		const writtenProperties = {} as Properties;

		while(match != null) {
			let key: string;
			let value: number | string | boolean;

			for (let i = 0; i < match.length; i++) {
				if (match[i] == null) match[i] = ""; 
			}

			if (match[2] == null || match[2] == "") {
				key = match[1];
				value = true;
			} else if (match[3] == "true") {
				key = match[2];
				value = true;
			} else if (match[3] == "false") {
				key = match[2];
				value = false;
			}
			else {
				key = match[2];
				value = match[3];
			}

			if (Properties.hasOwnProperty(key)) {
				throw('"'+key+'" is not a valid property.');
			} else {
				writtenProperties[key] = value;
			}

			match = this.propertyPattern.exec(text);
		}

		return new Properties(writtenProperties);
	}
}