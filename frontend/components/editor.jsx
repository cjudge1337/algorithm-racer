let React = require('react');
let ReactDOM = require('react-dom');
let Codemirror = require('../src/Codemirror');
let safeEval = require('safe-eval');

let APIUtil = require('../api_util');

require('codemirror/mode/javascript/javascript');
require('codemirror/mode/ruby/ruby');
require('codemirror/mode/xml/xml');
require('codemirror/mode/markdown/markdown');

let defaults = {
	SORT: {
		javascript: 'mySort = (array) => {\n' +
								'\t//code goes here\n' +
								'\treturn array\n}'
	},
	ARRAY_SEARCH: {
		javascript: 'mySearch = (array, target) => {\n' +
								'\t//code goes here\n' +
								'\treturn index\n}'
	}
};


let generateSearchTest = (length, max=1000) => {
	let arr = randomArray(length, max).sort(defaultSort);
	let idx = Math.round(Math.random() * arr.length);
	let tgt = arr[idx];
	return { array: arr, target: tgt, index: idx };
};

let generateSortTests = (length, max=1000) => {
	let randArr = randomArray(length, max);
	let sortedArr = randArr.slice(0).sort(defaultSort);
	let reversedArr = sortedArr.slice(0).reverse();
	return { random: randArr, sorted: sortedArr, reverse: reversedArr };
};

let defaultSort = (a, b) => {
		return a-b;
};

let randomArray = (length, max=1000) => {
	let array = [];
	for (var i = 0; i < length; i++) {
		array.push(Math.round(Math.random() * max));
	}
	return array;
};

let isArrayEqual = (arr1, arr2) => {

    let i = arr1.length;
    if (i !== arr2.length) return false;
    while (i--) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
};

let tests = {
	SORT: generateSortTests(50),

	ARRAY_SEARCH: {
		small_sorted: generateSearchTest(20),
		large_sorted: generateSearchTest(100)
	}
};


let Editor = React.createClass({
	getInitialState () {
		return {
			code: defaults.SORT.javascript,
			readOnly: false,
			mode: 'javascript',
			speed: 0,
			golfScore: 0,
			totalScore: 0,
			title: "",
			category: '',
			testArgs: "",
			testOutput: "Output will appear here."
		};
	},


	updateCode (newCode) {
		this.setState({ code: newCode });
	},

	updateTitle (e) {
		this.setState({ title: e.target.value });
	},

	updateCategory (e) {
		let category = e.target.value;
		this.setState({ category: category });
		this.setState({ code: defaults[category][this.state.mode] });
	},

	changeMode (e) {
		let mode = e.target.value;
		this.setState({ mode: mode, code: defaults[mode] });
	},

	updateTestArgs (e) {
		this.setState({ testArgs: e.target.value });
	},

	toggleReadOnly () {
		this.setState({
			readOnly: !this.state.readOnly
		}, () => this.refs.editor.focus());
	},

	interact (cm) {
		console.log(cm.getValue());
	},

	handleSubmit (e) {
		e.preventDefault();
		this.refs.submit.setAttribute('disabled', 'disabled');
		const ajax = () => {
			let data = {
				algorithm: {
					title: this.state.title,
					body: this.state.code,
					speed: this.state.speed * 100,
					category: this.state.category,
					golf_score: this.state.golfScore * 100,
					total_score: this.state.totalScore
				}
			};
			APIUtil.createAlgo(data)
				.then((resp) => this.handleSuccess(resp));
		};
		this.setSpeed(ajax);


	},

	handleSuccess (resp) {
		this.setState({
			title: "",
			totalScore: 0,
			golfScore: 0,
			category: "",
			speed: 0
		});
		this.refs.submit.removeAttribute('disabled');
	},

	submit (ajax) {
		this.setState({
			totalScore: this.state.speed * this.state.golfScore * 100
		}, ajax);
	},

	// This function might be superfluous now. Should we remove it?
	// runCode () {
	// 	let testFunc = safeEval(this.state.code);
	// 	safeEval(testFunc);
	// },

	testCode () {
		let testFunc = "";
		let args = "";
		let output = "";

		try {
			testFunc = safeEval(this.state.code);
			args = safeEval(this.state.testArgs);
			output = testFunc(args);
			//testing purposes
			console.log(this.validateSort(testFunc));
			this.testSpeed(testFunc);
		}
		catch (e) {
			output = "Error! " + e.message;
		}


		this.setState({ testOutput: output });
	},

	setSpeed (ajax) {
		let func = safeEval(this.state.code);
		let start = window.performance.now();
		for (var i = 0; i < 200; i++) {
			if (this.state.category === "SORT") {
				this.runSortTests(func);
			}else if (this.state.category === "ARRAY_SEARCH") {
				this.runSearchTests(func);
			}
		}
		let end = window.performance.now();
		let difference = end - start;
		let speedScore = (100-difference)/100;
		this.setState({
			speed: speedScore
		}, this.setGolfScore.bind(this, ajax));
	},

	//Purely for testing at the moment, might not need in production code
	testSpeed (func) {
		let runs = 100;
		let start = performance.now();
		for (var i = 0; i < runs; i++) {
			if (this.state.category === "SORT") {
				this.runSortTests(func);
			}else if (this.state.category === "ARRAY_SEARCH") {
				this.runSearchTests(func);
			}
		}
		let end = performance.now();
		let difference = end - start;
		let average = difference / runs;
		console.log("num runs: " + runs);
		console.log("total time: " + difference);
		console.log("avg time: " + average);
	},

	validateSort (func) {
		let testResult = func(tests.SORT.random);
		return (isArrayEqual(testResult, tests.SORT.sorted));
	},

	validateSearch (func) {
		let array = tests.ARRAY_SEARCH.large_sorted.array;
		let target = tests.ARRAY_SEARCH.large_sorted.target;
		let testResult = func(array, target);

		return (testResult === tests.ARRAY_SEARCH.large_sorted.index);
	},

	runSortTests (func) {
		for (let test in tests.SORT) {
			let array = tests.SORT[test].slice(0);
			func(array);
		}
	},

	runSearchTests (func) {
		for (let test in tests.ARRAY_SEARCH) {
			let array = tests.SEARCH[test].slice(0);
			func(array);
		}
	},

	setGolfScore (ajax) {
		let algoCount = this.state.code.split('').length;
		let mult = (1000-algoCount)/1000;
		this.setState({ golfScore: mult }, this.submit.bind(this, ajax));
	},

	render () {
		let options = {
			lineNumbers: true,
			readOnly: this.state.readOnly,
			mode: this.state.mode
		};
		return (
			<div>
				<h2>Submit an Algorithm</h2>
				<label>
					<input onChange={this.updateTitle}
								 type='text'
								 placeholder="Title"
								 value={this.state.title} />
				</label>

				<label className="select-arrow">
					<select value={this.state.category}
									onChange={this.updateCategory}>
						<option value="" disabled>Category</option>
		        <option value="SORT">Sorting</option>
		        <option value="ARRAY_SEARCH">Array Searching</option>
	      	</select>
	      </label>

				<br />

				<Codemirror ref="editor"
										value={this.state.code}
										onChange={this.updateCode}
										options={options}
										interact={this.interact} />

				<br />

				<input type='submit'
							 ref="submit"
							 onClick={this.handleSubmit}
							 value='Submit Algorithm' />

				<button className="test-button"
							 	onClick={this.testCode}>
					Test Code
				</button>

				<div id="editor-testing">
				  <input onChange={this.updateTestArgs}
							   type='text'
							 	 placeholder="Enter test arguments here"
							   value={this.state.testArgs} />

					<textarea value={this.state.testOutput}
										readOnly="true" />

				</div>
			</div>
		);
	}
});

export default Editor;
