/* --------------------
 * react-lazy-data module
 * Render method
 * ------------------*/

// Modules
import ReactDOM from 'react-dom';

// Exports

export default function render(element) {
	// Render
	const container = document.createElement('div');
	document.body.appendChild(container);

	let rendered = false;
	ReactDOM.render(element, container, () => { rendered = true; });

	// Sanity check - make sure render completes synchronously
	expect(rendered).toBeTrue();

	return container;
}
