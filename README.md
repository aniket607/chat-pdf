# PDF Chat Application

An intelligent PDF chat application that allows you to upload PDF documents and have conversations about their content using AI. Built with Next.js 14, Google Gemini AI, and RAG (Retrieval-Augmented Generation) technology.

## 🌟 Features

- **PDF Upload & Processing**: Upload PDFs with drag-and-drop interface
- **AI-Powered Chat**: Ask questions about your PDF content using Google Gemini
- **Smart Citations**: Get clickable page references that navigate directly to relevant PDF sections
- **PDF Viewer**: Built-in PDF viewer with zoom, rotation, and smooth page navigation
- **Multi-Document Support**: Manage and switch between multiple uploaded PDFs
- **Persistent Storage**: Documents and chat history survive server restarts
- **Real-time Processing**: Live progress updates during PDF ingestion


## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **AI**: Google Gemini (gemini-1.5-flash), Vercel AI SDK
- **Vector Store**: Pinecone for embeddings and similarity search
- **Database**: NeonDB (PostgreSQL) for metadata persistence
- **File Storage**: Vercel Blob for PDF file storage
- **PDF Processing**: LlamaParse for advanced text extraction
- **PDF Viewing**: react-pdf for in-browser PDF rendering

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- npm or yarn package manager
- The following API keys and services:
  - Google AI Studio API key (for Gemini)
  - LlamaCloud API key (for PDF parsing)
  - Pinecone API key and index
  - NeonDB database URL
  - Vercel Blob store token

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd chat-pdf
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Google AI (Gemini)
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here
   
   # LlamaCloud (PDF Parsing)
   LLAMA_CLOUD_API_KEY=your_llamacloud_api_key_here
   
   # Pinecone (Vector Storage)
   PINECONE_API_KEY=your_pinecone_api_key_here
   PINECONE_INDEX=your_pinecone_index_name
   
   # NeonDB (PostgreSQL Database)
   DATABASE_URL=your_neondb_connection_string
   
   # Vercel Blob (File Storage)
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
   ```

4. **Set up the database**
   
   The application will automatically create the required tables on first run. The schema includes:
   - `documents` table for PDF metadata
   - Automatic indexing for efficient queries

5. **Configure Pinecone Index**
   
   Create a Pinecone index with these specifications:
   - **Dimension**: 768 (matches Google's text-embedding-004 model)
   - **Metric**: cosine
   - **Cloud**: Any (AWS/GCP/Azure)

## 🏃‍♂️ Getting Started

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

3. **Upload your first PDF**
   - Click "Upload PDF" or drag and drop a PDF file
   - Wait for processing to complete (parsing, embedding, indexing)
   - Start chatting about your document!

## 📖 Usage Guide

### Uploading Documents

1. **Single Upload**: Click "Upload PDF" button or drag-drop a file
2. **Multiple Documents**: Upload additional PDFs using the "+" button
3. **Processing Stages**: 
   - Uploading (file transfer)
   - Parsing (text extraction with LlamaParse)
   - Embedding (converting text to vectors)
   - Indexing (storing in Pinecone)

### Chatting with PDFs

1. **Ask Questions**: Type natural language questions about your PDF content
2. **Get Responses**: Receive AI-generated answers with relevant context
3. **Follow Citations**: Click citation buttons (e.g., "p.3") to jump to specific PDF pages
4. **Switch Documents**: Use the dropdown to chat with different uploaded PDFs

### Managing Documents

- **View All PDFs**: Use the dropdown menu in the header
- **Switch Active PDF**: Select any PDF from the dropdown
- **Delete PDFs**: Click the "×" icon next to any PDF in the dropdown
- **PDF Viewer Controls**: Zoom in/out, rotate, and scroll through pages

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio API key for Gemini | ✅ |
| `LLAMA_CLOUD_API_KEY` | LlamaCloud API key for PDF parsing | ✅ |
| `PINECONE_API_KEY` | Pinecone API key for vector storage | ✅ |
| `PINECONE_INDEX` | Name of your Pinecone index | ✅ |
| `DATABASE_URL` | NeonDB PostgreSQL connection string | ✅ |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token | ✅ |

### API Rate Limits

The application includes built-in retry logic for:
- Google Gemini API (handles overload errors)
- LlamaCloud parsing (network timeouts)
- Pinecone operations (rate limiting)


## 📚 API Endpoints

- `POST /api/upload` - Upload and process PDF files
- `GET /api/pdfs` - List all uploaded PDFs
- `DELETE /api/pdfs/[id]` - Delete a specific PDF
- `GET /api/doc/[id]/file` - Serve PDF file content
- `GET /api/doc/[id]/status` - Check processing status
- `POST /api/chat` - Handle chat interactions
- `GET /api/health` - System health check



## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Vercel AI SDK](https://sdk.vercel.ai/) for seamless AI integration
- [LlamaIndex](https://www.llamaindex.ai/) for PDF parsing capabilities
- [Pinecone](https://www.pinecone.io/) for vector database services
- [Google AI](https://ai.google.dev/) for Gemini language model
- [react-pdf](https://github.com/wojtekmaj/react-pdf) for PDF viewing
