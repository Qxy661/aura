"""PubMed paper fetcher — NCBI E-utilities, free, no key required."""
import logging
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.research import Article

logger = logging.getLogger(__name__)

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"


def fetch_pubmed(db: Session, keywords: str = "", limit: int = 20) -> int:
    """Fetch papers from PubMed. Returns count of new papers."""
    if not keywords:
        keywords = "deep learning,computer vision"

    # Combine keywords with OR for broader search
    keyword_list = [k.strip() for k in keywords.split(",") if k.strip()]
    query = " OR ".join(keyword_list[:5])
    if len(query) > 200:
        query = query[:200]

    try:
        # Step 1: Search for PMIDs
        search_resp = httpx.get(
            ESEARCH_URL,
            params={
                "db": "pubmed",
                "term": query,
                "retmax": min(limit, 50),
                "sort": "relevance",
                "retmode": "json",
            },
            timeout=30.0,
            follow_redirects=True,
        )
        search_resp.raise_for_status()
        search_data = search_resp.json()
    except Exception as e:
        logger.warning(f"PubMed search failed: {e}")
        return 0

    id_list = search_data.get("esearchresult", {}).get("idlist", [])
    if not id_list:
        logger.info("PubMed: no papers found")
        return 0

    try:
        # Step 2: Fetch details for PMIDs
        fetch_resp = httpx.get(
            EFETCH_URL,
            params={
                "db": "pubmed",
                "id": ",".join(id_list),
                "retmode": "xml",
            },
            timeout=30.0,
            follow_redirects=True,
        )
        fetch_resp.raise_for_status()
    except Exception as e:
        logger.warning(f"PubMed fetch failed: {e}")
        return 0

    try:
        root = ET.fromstring(fetch_resp.text)
    except ET.ParseError as e:
        logger.warning(f"PubMed XML parse failed: {e}")
        return 0

    count = 0
    for article_elem in root.findall(".//PubmedArticle"):
        try:
            medline = article_elem.find("MedlineCitation")
            if medline is None:
                continue

            article = medline.find("Article")
            if article is None:
                continue

            title_elem = article.find("ArticleTitle")
            title = title_elem.text if title_elem is not None and title_elem.text else ""
            if not title:
                continue

            # Get PMID for URL
            pmid_elem = medline.find("PMID")
            pmid = pmid_elem.text if pmid_elem is not None else ""
            url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else ""

            # Skip if already exists
            if url and db.query(Article).filter(Article.url == url).first():
                continue

            # Authors
            authors_list = []
            author_list = article.find("AuthorList")
            if author_list is not None:
                for author in author_list.findall("Author")[:5]:
                    last = author.find("LastName")
                    first = author.find("ForeName")
                    name_parts = []
                    if last is not None and last.text:
                        name_parts.append(last.text)
                    if first is not None and first.text:
                        name_parts.append(first.text)
                    if name_parts:
                        authors_list.append(" ".join(name_parts))
            authors = ", ".join(authors_list)

            # Abstract
            abstract_elem = article.find("Abstract/AbstractText")
            abstract = abstract_elem.text if abstract_elem is not None and abstract_elem.text else ""

            # Publication date
            pub_date = None
            pub_date_elem = article.find("Journal/JournalIssue/PubDate")
            if pub_date_elem is not None:
                year_elem = pub_date_elem.find("Year")
                month_elem = pub_date_elem.find("Month")
                if year_elem is not None and year_elem.text:
                    try:
                        year = int(year_elem.text)
                        month = 1
                        if month_elem is not None and month_elem.text:
                            month_map = {
                                "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4,
                                "May": 5, "Jun": 6, "Jul": 7, "Aug": 8,
                                "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
                            }
                            month = month_map.get(month_elem.text, 1)
                        pub_date = datetime(year, month, 1)
                    except (ValueError, TypeError):
                        pass

            new_article = Article(
                title=title,
                url=url,
                source="pubmed",
                authors=authors,
                abstract=abstract,
                published_at=pub_date,
            )
            db.add(new_article)
            count += 1

        except Exception as e:
            logger.warning(f"PubMed article parse error: {e}")
            continue

    if count > 0:
        db.commit()
        logger.info(f"PubMed: added {count} new papers")

    return count
