class TextChunker:

    CHUNK_SIZE = 1000

    CHUNK_OVERLAP = 200

    @classmethod
    def chunk(cls, text: str):

        paragraphs = [

            paragraph.strip()

            for paragraph in text.split("\n\n")

            if paragraph.strip()

        ]

        chunks = []

        current = ""

        chunk_index = 0

        for paragraph in paragraphs:

            if len(current) + len(paragraph) <= cls.CHUNK_SIZE:

                current += paragraph + "\n\n"

            else:

                chunks.append(

                    {

                        "chunk_index": chunk_index,

                        "text": current.strip(),

                        "character_count": len(current.strip()),

                    }

                )

                overlap = current[-cls.CHUNK_OVERLAP:]

                current = overlap + "\n\n" + paragraph + "\n\n"

                chunk_index += 1

        if current:

            chunks.append(

                {

                    "chunk_index": chunk_index,

                    "text": current.strip(),

                    "character_count": len(current.strip()),

                }

            )

        return chunks