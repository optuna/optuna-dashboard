type CSVRecord = {
  [key: string]: string | string[]
}

export const parseCSVWithHeader = (input: string): CSVRecord[] => {
  const rows = parseCSVRows(stripUTF8BOM(input)).filter(
    (row) => !(row.length === 1 && row[0] === "")
  )
  if (rows.length === 0) {
    return []
  }

  const headers = normalizeHeaders(rows[0])
  return rows.slice(1).map((row) => {
    const record: CSVRecord = {}
    row.slice(0, headers.length).forEach((value, index) => {
      record[headers[index]] = value
    })
    if (row.length > headers.length) {
      record.__parsed_extra = row.slice(headers.length)
    }
    return record
  })
}

const stripUTF8BOM = (input: string): string => {
  return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
}

const normalizeHeaders = (headers: string[]): string[] => {
  const counts = new Map<string, number>()
  const used = new Set<string>()

  return headers.map((header) => {
    if (!used.has(header)) {
      used.add(header)
      counts.set(header, 1)
      return header
    }

    let suffix = counts.get(header) ?? 0
    let normalizedHeader = `${header}_${suffix}`
    while (used.has(normalizedHeader)) {
      suffix += 1
      normalizedHeader = `${header}_${suffix}`
    }
    counts.set(header, suffix + 1)
    used.add(normalizedHeader)
    return normalizedHeader
  })
}

const parseCSVRows = (input: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let afterQuote = false

  const pushField = () => {
    row.push(field)
    field = ""
    afterQuote = false
  }
  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
          afterQuote = true
        }
      } else {
        field += char
      }
      continue
    }

    if (afterQuote) {
      if (char === ",") {
        pushField()
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && input[index + 1] === "\n") {
          index += 1
        }
        pushRow()
      } else {
        field += char
        afterQuote = false
      }
      continue
    }

    if (char === '"' && field.length === 0) {
      inQuotes = true
    } else if (char === ",") {
      pushField()
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") {
        index += 1
      }
      pushRow()
    } else {
      field += char
    }
  }

  if (input.length > 0) {
    pushField()
    rows.push(row)
  }
  return rows
}
