<?php

namespace App\Support;

use RuntimeException;
use ZipArchive;

class SimpleXlsx
{
    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, string|int|float|null>>  $rows
     * @param  array<string, array<int, string>>  $options
     * @param  array<string, string>  $validations
     */
    public static function createTemplate(
        array $headers,
        array $rows = [],
        array $options = [],
        array $validations = [],
        string $sheetName = 'Datos',
    ): string {
        $path = tempnam(sys_get_temp_dir(), 'xlsx_');

        if ($path === false) {
            throw new RuntimeException('No se pudo crear el archivo temporal de Excel.');
        }

        $zip = new ZipArchive;

        if ($zip->open($path, ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('No se pudo abrir el archivo temporal de Excel.');
        }

        $zip->addFromString('[Content_Types].xml', self::contentTypes());
        $zip->addFromString('_rels/.rels', self::rootRels());
        $zip->addFromString('xl/workbook.xml', self::workbookXml($sheetName));
        $zip->addFromString('xl/_rels/workbook.xml.rels', self::workbookRels());
        $zip->addFromString('xl/styles.xml', self::stylesXml());
        $zip->addFromString('xl/worksheets/sheet1.xml', self::worksheetXml($headers, $rows, $validations, $options));
        $zip->addFromString('xl/worksheets/sheet2.xml', self::optionsWorksheetXml($options));
        $zip->close();

        return $path;
    }

    private static function worksheetXml(array $headers, array $rows, array $validations, array $options): string
    {
        $lastColumn = self::columnName(count($headers));
        $lastRow = max(count($rows) + 1, 200);
        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
        $xml .= '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
        $xml .= '<dimension ref="A1:'.$lastColumn.$lastRow.'"/>';
        $xml .= '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
        $xml .= '<sheetFormatPr defaultRowHeight="18"/>';
        $xml .= '<cols>';

        foreach ($headers as $index => $header) {
            $width = match ($header) {
                'dni' => 14,
                'nombres', 'apellidos' => 24,
                'gerencia', 'sede' => 32,
                default => 18,
            };
            $column = $index + 1;
            $xml .= '<col min="'.$column.'" max="'.$column.'" width="'.$width.'" customWidth="1"/>';
        }

        $xml .= '</cols><sheetData>';
        $xml .= self::rowXml(1, $headers, true);

        foreach ($rows as $index => $row) {
            $xml .= self::rowXml($index + 2, $row, false);
        }

        $xml .= '</sheetData>';

        $validationXml = [];

        foreach ($validations as $columnHeader => $optionKey) {
            $columnIndex = array_search($columnHeader, $headers, true);
            $optionIndex = array_search($optionKey, array_keys($options), true);

            if ($columnIndex === false || $optionIndex === false || empty($options[$optionKey])) {
                continue;
            }

            $column = self::columnName($columnIndex + 1);
            $optionColumn = self::columnName($optionIndex + 1);
            $optionRows = count($options[$optionKey]) + 1;
            $range = $column.'2:'.$column.'200';
            $formula = "'Opciones'!\$".$optionColumn.'$2:$'.$optionColumn.'$'.$optionRows;

            $validationXml[] = '<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="'.$range.'">'
                .'<formula1>'.self::escape($formula).'</formula1>'
                .'</dataValidation>';
        }

        if ($validationXml !== []) {
            $xml .= '<dataValidations count="'.count($validationXml).'">';
            $xml .= implode('', $validationXml);
            $xml .= '</dataValidations>';
        }

        $xml .= '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>';
        $xml .= '</worksheet>';

        return $xml;
    }

    private static function optionsWorksheetXml(array $options): string
    {
        $headers = array_keys($options);
        $maxRows = max(array_map('count', $options) ?: [0]);
        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
        $xml .= '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
        $xml .= '<dimension ref="A1:'.self::columnName(max(count($headers), 1)).max($maxRows + 1, 1).'"/>';
        $xml .= '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
        $xml .= '<sheetFormatPr defaultRowHeight="18"/>';
        $xml .= '<sheetData>';
        $xml .= self::rowXml(1, $headers, true);

        for ($rowIndex = 0; $rowIndex < $maxRows; $rowIndex++) {
            $row = [];

            foreach ($headers as $header) {
                $row[] = $options[$header][$rowIndex] ?? null;
            }

            $xml .= self::rowXml($rowIndex + 2, $row, false);
        }

        $xml .= '</sheetData></worksheet>';

        return $xml;
    }

    private static function rowXml(int $rowNumber, array $values, bool $header): string
    {
        $xml = '<row r="'.$rowNumber.'">';

        foreach ($values as $index => $value) {
            $cell = self::columnName($index + 1).$rowNumber;
            $style = $header ? ' s="1"' : '';

            if ($value === null || $value === '') {
                $xml .= '<c r="'.$cell.'"'.$style.'/>';

                continue;
            }

            if (is_numeric($value) && ! $header) {
                $xml .= '<c r="'.$cell.'"'.$style.'><v>'.$value.'</v></c>';

                continue;
            }

            $xml .= '<c r="'.$cell.'" t="inlineStr"'.$style.'><is><t>'.self::escape((string) $value).'</t></is></c>';
        }

        return $xml.'</row>';
    }

    private static function columnName(int $index): string
    {
        $name = '';

        while ($index > 0) {
            $index--;
            $name = chr(65 + ($index % 26)).$name;
            $index = intdiv($index, 26);
        }

        return $name;
    }

    private static function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
    }

    private static function contentTypes(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            .'<Default Extension="xml" ContentType="application/xml"/>'
            .'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            .'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            .'<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            .'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            .'</Types>';
    }

    private static function rootRels(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            .'</Relationships>';
    }

    private static function workbookXml(string $sheetName): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<sheets>'
            .'<sheet name="'.self::escape($sheetName).'" sheetId="1" r:id="rId1"/>'
            .'<sheet name="Opciones" sheetId="2" state="hidden" r:id="rId2"/>'
            .'</sheets>'
            .'</workbook>';
    }

    private static function workbookRels(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            .'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>'
            .'<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            .'</Relationships>';
    }

    private static function stylesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
            .'<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/><bgColor indexed="64"/></patternFill></fill></fills>'
            .'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            .'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            .'<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/></cellXfs>'
            .'</styleSheet>';
    }
}
