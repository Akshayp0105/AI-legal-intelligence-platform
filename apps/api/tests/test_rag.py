import pytest
from unittest.mock import AsyncMock, patch, MagicMock


class TestRagService:
    @patch("services.rag_service.get_embeddings")
    @patch("services.rag_service.index_chunks")
    @patch("services.rag_service.get_text_splitter")
    def test_index_document_calls_pipeline(self, mock_splitter, mock_index, mock_embed):
        from services.rag_service import index_document
        import asyncio

        mock_splitter_instance = MagicMock()
        mock_splitter_instance.split_text.return_value = ["chunk1", "chunk2"]
        mock_splitter.return_value = mock_splitter_instance
        mock_embed.return_value = [[0.1] * 3072, [0.2] * 3072]

        asyncio.run(index_document("doc-123", "This is test legal text about IPC section 302."))

        mock_splitter_instance.split_text.assert_called_once()
        mock_embed.assert_called_once_with(["chunk1", "chunk2"])
        mock_index.assert_called_once()

    @patch("services.rag_service.get_embeddings")
    @patch("services.rag_service.index_chunks")
    @patch("services.rag_service.get_text_splitter")
    def test_index_document_skips_empty_text(self, mock_splitter, mock_index, mock_embed):
        from services.rag_service import index_document
        import asyncio

        asyncio.run(index_document("doc-123", ""))
        asyncio.run(index_document("doc-456", "   "))

        mock_splitter.assert_not_called()
        mock_index.assert_not_called()


class TestChunker:
    def test_get_text_splitter(self):
        from services.rag.chunker import get_text_splitter
        splitter = get_text_splitter()
        assert splitter is not None

    def test_chunk_statute_short_text(self):
        from services.rag.chunker import chunk_statute
        chunks = chunk_statute("Short text", "302", "IPC")
        assert len(chunks) == 1
        assert chunks[0].startswith("Section 302 IPC")

    def test_chunk_judgment(self):
        from services.rag.chunker import chunk_judgment
        text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
        chunks = chunk_judgment(text)
        assert len(chunks) >= 1
