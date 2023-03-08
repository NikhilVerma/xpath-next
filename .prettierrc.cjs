module.exports = {
	printWidth: 100,
	tabWidth: 2,
	useTabs: true,
	overrides: [
		{
			files: ["package.json", "*.html"],
			options: {
				useTabs: false
			}
		}
	]
};
