# Markdown Diff to DOCX Preview

A React Vite application that compares two markdown files, processes the differences using the `diff` package, generates a DOCX file with the comparison results using the `docx` package, and provides a preview interface.

## Features

- Upload two markdown files for comparison
- Generate diff using the `diff` package
- Create DOCX file with highlighted differences
- Preview diff results in the browser
- Download the generated DOCX file

## Installation

```bash
npm install
```

## Usage

1. Start the development server:

    ```bash
    npm run dev
    ```

2. Open your browser and navigate to `http://localhost:3000`

3. Upload two markdown files using the file upload interface

4. Click "Compare Files" to generate the diff

5. Preview the differences in the browser

6. Click "Download as DOCX" to download the comparison results as a Word document

## Sample Files

The project includes sample markdown files in the `public/` directory:

- `sample1.md` - First version
- `sample2.md` - Second version with changes

## Dependencies

- `react` - UI framework
- `vite` - Build tool
- `diff` - Text comparison utility
- `docx` - DOCX file generation
- `marked` - Markdown parser

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
