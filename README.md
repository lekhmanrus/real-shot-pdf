<h1 align="center">RealShotPDF</h1>

<p align="center">
  <img src="https://raw.githubusercontent.com/lekhmanrus/real-shot-pdf/main/angular/src/assets/logo.svg"
       alt="RealShotPDF: Capture the Essence, Preserve the Reality!" height="175px" />
  <br />
  <em>
    RealShotPDF is a Chrome extension designed to simplify the process of creating PDF documents from web content. The extension allows users to navigate through selected webpages, parse and display links in a tree view, and generate PDFs for the chosen pages. It operates locally without sending any data to external servers.
    <br />
    Happy PDF Generating with RealShotPDF! 🚀
  </em>
</p>


<hr />


## Features

- **Link Parsing:**
  - Automatically extracts links from the current webpage.
  - Displays links in a user-friendly tree view.

- **Selective PDF Generation:**
  - Choose specific web pages or entire hosts for PDF generation.
  - Users can choose to merge all PDFs into a single document or download separate PDFs for each webpage.

- **Anchor Handling:**
  - Option to ignore or allow anchors in parsed links.

- **Local Processing:**
  - No data is sent to external servers.
  - PDF generation uses the Chrome debugger to simulating user actions of pressing `Ctrl` + `P` or executing the Print command to generate PDFs.

- **Dynamic Page Tree:**
  - Extension dynamically updates the page tree as it navigates through selected web pages.


## Use Cases

### Collect Local Documentation

RealShotPDF allows you to collect local documentation (or any other content, even that may be restricted by credentials or lack user-friendly download options) from web sources, providing a convenient way to share information with somebody else (i.e. colleagues).

### Create Knowledge Base for ChatGPT Assistant

Use the extension to gather data from desired web portals and feed that data as a knowledge base to your GPT-based assistant, expanding its capabilities. This is particularly useful for creating a local repository of information that can be utilized by AI assistants, such as GPT models.


## How to Use

1. **Installation:**
   - Download the extension from the [Chrome Web Store]().
   - Add the extension to your Chrome browser.
   - If RealShotPDF is not yet available on the Chrome Web Store, you can download and manually install the extension follow the instructions below:
      1. [Download RealShotPDF](https://github.com/lekhmanrus/real-shot-pdf/archive/refs/tags/v0.0.1.zip).
      2. Extract the contents of the zip file to a directory on your computer.
      3. Load Unpacked:
           - Open your Chrome browser and navigate to `chrome://extensions/`.
           - Enable "Developer mode" in the top-right corner.
           - Click on the "Load unpacked" button.
           - Select the directory where you extracted the RealShotPDF extension.
      4. The RealShotPDF icon should now appear in your Chrome toolbar, indicating a successful installation.
      5. Click on the RealShotPDF icon to open the extension popup.

2. **Opening the Extension:**
   - Click on the extension icon in the Chrome toolbar when browsing a webpage.

3. **Link Parsing:**
   - Links from the current webpage are automatically parsed and displayed in the tree view.

4. **Selective PDF Generation:**
   - Choose desired web pages or entire hosts from the tree view  for PDF generation.

5. **PDF Options:**
   - Decide whether to merge all PDFs into a single document or download separate PDFs for each webpage.
   - Choose to ignore or allow anchors in parsed links.

6. **WYSIWYG PDF Generation:**
   - Initiate PDF generation utilizing the Chrome debugger to generate PDFs, simulating the user's print action.

7. **Dynamic Page Tree:**
   - The page tree dynamically updates (adds new tree nodes - links) as it navigates through selected web pages.


## Privacy

RealShotPDF respects user privacy by performing all operations locally, without sending any data to external servers.


## License

This project is licensed under the [MIT License](LICENSE).


## Contribution

Contributions are welcome! If you encounter issues or have suggestions, feel free to [create an issue](https://github.com/lekhmanrus/real-shot-pdf/issues) or submit a pull request.


## Disclaimer

RealShotPDF is developed for personal use cases and is not intended for malicious or unethical purposes. Users are encouraged to respect the terms of service of the websites they interact with.

