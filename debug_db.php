<?php
require_once 'includes/database.php';

function findKeywords($tables, $keywords) {
    $found = [];
    foreach ($tables as $table) {
        foreach ($keywords as $kw) {
            if (stripos($table, $kw) !== false) {
                $found[] = $table;
                break;
            }
        }
    }
    return array_unique($found);
}

try {
    echo "--- ALL TABLES ---\n";
    $stmt = $pdo->query("SHOW TABLES");
    $allTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo implode(", ", $allTables) . "\n";

    $keywords = ['casa', 'edif', 'apart', 'avenida', 'establecimiento', 'centro', 'quinta'];
    $relevantTables = findKeywords($allTables, $keywords);

    echo "\n--- RELEVANT TABLES FOUND ---\n";
    foreach ($relevantTables as $table) {
        echo "\nTable: $table\n";
        $stmt = $pdo->query("DESCRIBE `$table`");
        $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($cols as $col) {
            echo "  - {$col['Field']} ({$col['Type']})\n";
        }
    }

    echo "\n--- INMUEBLE TABLE SCHEMA ---\n";
    $stmt = $pdo->query("DESCRIBE inmueble");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $col) {
        echo "  - {$col['Field']} ({$col['Type']})\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
