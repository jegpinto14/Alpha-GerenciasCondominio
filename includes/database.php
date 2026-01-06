<?php
// Configuración de la base de datos
$host = 'localhost';
$dbname = 'alpha_gerenciaexpress';
$username = 'root';
$password = 'root';


try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    throw new PDOException("Error de conexión: " . $e->getMessage());
}
