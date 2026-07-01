import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter
from core.logging import get_logger

logger = get_logger(__name__)

def get_text_splitter() -> RecursiveCharacterTextSplitter:
    # 800 tokens, 100 overlap
    encoding = tiktoken.get_encoding("cl100k_base")
    def tiktoken_len(text: str) -> int:
        return len(encoding.encode(text))

    return RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        length_function=tiktoken_len,
        separators=["\n\n", "\n", ".", " ", ""]
    )

def chunk_statute(section_text: str, section_number: str, act_name: str) -> list[str]:
    """
    Chunks a statute text, ensuring context like act name and section number is retained.
    """
    splitter = get_text_splitter()
    prefix = f"Section {section_number} {act_name} - "
    
    # Check if we need to split
    encoding = tiktoken.get_encoding("cl100k_base")
    total_tokens = len(encoding.encode(prefix + section_text))
    
    if total_tokens <= 800:
        return [prefix + section_text]
        
    # Split and prepend prefix to each chunk
    chunks = splitter.split_text(section_text)
    return [prefix + chunk for chunk in chunks]

def chunk_judgment(judgment_text: str) -> list[str]:
    """
    Chunks a judgment text, typically splitting by paragraphs.
    """
    splitter = get_text_splitter()
    # RecursiveCharacterTextSplitter defaults to "\n\n" as first separator
    return splitter.split_text(judgment_text)
