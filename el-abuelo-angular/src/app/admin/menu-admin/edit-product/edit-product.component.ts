import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MenuService } from '../../../core/services/menu.service';
import { MenuProduct } from '../../../core/models/menuProduct';
import { CommonModule } from '@angular/common';
import { UploadService } from '../../../core/services/upload.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-edit-product',
  imports: [CommonModule, ReactiveFormsModule, RouterLink], // Aquí es donde debes incluirlo
  standalone: true,
  templateUrl: './edit-product.component.html',
  styleUrl: './edit-product.component.scss',
  providers: [MenuService, UploadService],
})
export class EditProductComponent implements OnInit {
  productForm: FormGroup;
  productId: string | null = null;
  product: MenuProduct | null = null;

  selectedFile: File | null = null;
  imageUrl: string | null = null; // Añadir esta propiedad para almacenar la URL de la imagen
  isValidImage: boolean = true; // Agregar esta propiedad
  imagePreviewUrl: string | null = null; // Propiedad para la vista previa

  constructor(
    private route: ActivatedRoute,
    private menuService: MenuService,
    private fb: FormBuilder,
    private router: Router,
    private uploadService: UploadService
  ) {
    this.productForm = this.fb.group({
      namee: [''],
      precio: [''],
      image: [''],
      categoria: [''],
      // Otros campos que tengas en MenuProduct
    });
  }

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id'); // Obtén el ID del producto de la URL
    if (this.productId) {
      this.loadProduct(this.productId); // Cargar el producto con el ID
    }
  }

  loadProduct(id: string) {
    // Usar el método getMenuById que ya tienes en tu servicio
    this.menuService.getMenuById(id).subscribe((product: MenuProduct) => {
      this.product = product;
      // Rellenar el formulario con los datos del producto
      this.productForm.patchValue({
        namee: product.namee,
        precio: product.precio,
        image: product.image, // Dependiendo de los campos de tu modelo
        categoria: product.categoria,
      });
      this.imageUrl = product.image; // Suponiendo que product.image es la URL de la imagen
      this.imagePreviewUrl = this.imageUrl; // Establecer la vista previa
    });
  }
  generateUniqueId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']; // Tipos de imagen válidos

      if (validTypes.includes(file.type)) {
        const newFileName = this.generateUniqueId() + '.png';

        // Crear un nuevo archivo con el nombre modificado
        this.selectedFile = new File([file], newFileName, { type: file.type });
        this.isValidImage = true; // Archivo válido
        //! console.log('Archivo seleccionado:', this.selectedFile);

        // Generar vista previa de la imagen
        const reader = new FileReader();
        reader.onload = () => {
          this.imagePreviewUrl = reader.result as string; // Almacenar la URL de la vista previa
        };
        reader.readAsDataURL(file); // Leer el archivo como una URL de datos
      } else {
        this.isValidImage = false; // Archivo no válido
        console.error(
          'Por favor, selecciona un archivo de imagen válido (JPEG, PNG, GIF, WEBP).'
        );
        input.value = ''; // Limpiar el input para que no retenga el archivo no válido
        this.imagePreviewUrl = null; // Reiniciar la vista previa
      }
    }
  }

  saveProduct() {
    if (this.productForm.valid && this.productId) {
      this.onUpload().subscribe(() => {
        const updatedProduct = {
          ...this.productForm.value,
          id: this.productId,
          image: this.imageUrl,
        }; // Agregar el ID al objeto

        this.menuService
          .updateMenuItem(this.productId!, updatedProduct)
          .subscribe(
            (response) => {
              console.log('Producto actualizado exitosamente:', response);
              setTimeout(() => {
                alert('El producto se ha actualizado correctamente.'); // Muestra la alerta
                this.router.navigate(['/admin/menu']); // Redirige al menú (ajusta la ruta según tu configuración)
              }, 1000);

              // Aquí puedes redirigir o mostrar un mensaje de éxito
            },
            (error) => {
              console.error('Error al actualizar el producto:', error);
              // Manejo de errores aquí
            }
          );
      });
    } else {
      console.error('Formulario inválido o ID de producto no encontrado.');
    }
  }
  onUpload() {
    return new Observable((observer) => {
      if (this.selectedFile) {
        // Primero sube la imagen
        this.uploadService.uploadImage(this.selectedFile).subscribe(
          (response) => {
            const fileName = this.selectedFile!.name;

            // Usar setTimeout para esperar un tiempo antes de obtener la imagen
            setTimeout(() => {
              this.uploadService.getImage(fileName).subscribe(
                (imageResponse) => {
                  this.imageUrl = imageResponse.url; // Almacenar la URL de la imagen
                  //! console.log(this.imageUrl);
                  observer.next(); // Notificar que la operación fue exitosa
                  observer.complete(); // Completar el observable
                },
                (error) => {
                  console.error('Error al obtener la imagen', error);
                  observer.error(error); // Notificar el error
                }
              );
            }, 1000); // Retrasar 1000 ms (1 segundo)
          },
          (error) => {
            console.error('Error al subir la imagen', error);
            observer.error(error); // Notificar el error
          }
        );
      } else {
        console.error('No hay archivo seleccionado');
        observer.error('No hay archivo seleccionado'); // Notificar el error
      }
    });
  }
}
