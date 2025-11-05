import '../main.css'

document.querySelector('#app').innerHTML = ` 
    <div
      class="flex flex-col justify-center items-center bg-zinc-950 h-max min-h-[100vh] pb-5"
    >
      <div
        class="mx-auto flex w-full flex-col justify-center px-5 pt-0 md:h-[unset] md:max-w-[50%] lg:h-[100vh] min-h-[100vh] lg:max-w-[50%] lg:px-6"
      >
        <a class="mt-10 w-fit text-white" href="/">
          <div class="flex w-fit items-center lg:pl-0 lg:pt-0 xl:pt-0">
            <svg
              stroke="currentColor"
              fill="currentColor"
              stroke-width="0"
              viewBox="0 0 320 512"
              class="mr-3 h-[13px] w-[8px] text-white"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"
              ></path>
            </svg>
            <p class="ml-0 text-sm text-white">Back to the website</p>
          </div>
        </a>
        <div
          class="my-auto mb-auto mt-8 flex flex-col md:mt-[70px] w-[350px] max-w-[450px] mx-auto md:max-w-[450px] lg:mt-[130px] lg:max-w-[450px]"
        >
          <p class="text-[32px] font-bold text-white">Entrar</p>
          <p class="mb-2.5 mt-2.5 font-normal text-zinc-400">
            Digite seu email e senha para logar!
          </p>
          
          <!-- [INÍCIO DA SEÇÃO DE LOGIN SOCIAL] -->
          <div class="mt-8">
            <!-- 
              Usei flex-col para empilhar em mobile (default) 
              e sm:flex-row para colocar lado a lado em telas small e maiores.
              gap-4 adiciona espaçamento entre os botões.
            -->
            <div class="flex flex-col sm:flex-row gap-4">
              
              <!-- Botão Google -->
              <form class="pb-2 w-full sm:w-1/2">
                <input type="hidden" name="provider" value="google" />
                <button
                  class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-800 bg-none hover:bg-zinc-800 hover:text-accent-foreground h-10 px-4 w-full text-white py-6"
                  type="submit"
                >
                  <span class="mr-2">
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      stroke-width="0"
                      version="1.1"
                      x="0px"
                      y="0px"
                      viewBox="0 0 48 48"
                      enable-background="new 0 0 48 48"
                      class="h-5 w-5"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill="#FFC107"
                        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                      ></path>
                      <path
                        fill="#FF3D00"
                        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                      ></path>
                      <path
                        fill="#4CAF50"
                        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                      ></path>
                      <path
                        fill="#1976D2"
                        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                      ></path>
                    </svg>
                  </span>
                  <span>Google</span>
                </button>
              </form>

              <!-- Botão Facebook -->
              <form class="pb-2 w-full sm:w-1/2">
                <input type="hidden" name="provider" value="facebook" />
                <button
                  class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-800 bg-none hover:bg-zinc-800 hover:text-accent-foreground h-10 px-4 w-full text-white py-6"
                  type="submit"
                >
                  <span class="mr-2">
                    <!-- SVG do Facebook -->
                    <svg
                      stroke="currentColor"
                      fill="#1877F2"
                      stroke-width="0"
                      viewBox="0 0 512 512"
                      class="h-5 w-5"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z"
                      ></path>
                    </svg>
                  </span>
                  <span>Facebook</span>
                </button>
              </form>
            </div>
          </div>
          <!-- [FIM DA SEÇÃO DE LOGIN SOCIAL] -->

          <div class="relative my-4">
            <div class="relative flex items-center py-1">
              <div class="grow border-t border-zinc-800"></div>
              <!-- Adicionei um texto "OU" no meio -->
              <span class="mx-4 flex-shrink text-xs text-zinc-400">OU</span>
              <div class="grow border-t border-zinc-800"></div>
            </div>
          </div>
          <div>
          <!-- [INÍCIO DO FORMULÁRIO DE EMAIL/SENHA] -->
            <form novalidate="" class="mb-4">
              <div class="grid gap-2">
                <div class="grid gap-1">
                  <label class="text-white" for="email">Email</label
                  ><input
                    class="mr-2.5 mb-2 h-full min-h-[44px] w-full rounded-lg border bg-zinc-950 text-white border-zinc-800 px-4 py-3 text-sm font-medium placeholder:text-zinc-400 focus:outline-0 dark:border-zinc-800 dark:bg-transparent dark:text-white dark:placeholder:text-zinc-400"
                    id="email"
                    placeholder="nome@exemplo.com"
                    type="email"
                    autocapitalize="none"
                    autocomplete="email"
                    autocorrect="off"
                    name="email"
                  /><label
                    class="text-zinc-950 mt-2 dark:text-white"
                    for="Senha"
                    >Senha</label
                  ><input
                    id="Senha"
                    placeholder="Senha"
                    type="Senha"
                    autocomplete="current-Senha"
                    class="mr-2.5 mb-2 h-full min-h-[44px] w-full rounded-lg border bg-zinc-950 text-white border-zinc-800 px-4 py-3 text-sm font-medium placeholder:text-zinc-400 focus:outline-0 dark:border-zinc-800 dark:bg-transparent dark:text-white dark:placeholder:text-zinc-400"
                    name="Senha"
                  />
                </div>
                <!-- Botão de "Entrar" (Login principal) -->
                <button
                  class="whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white text-zinc-950 hover:bg-white/90 active:bg-white/80 flex w-full max-w-full mt-6 items-center justify-center rounded-lg px-4 py-4 text-base font-medium"
                  type="submit"
                >
                Entrar
                </button>
              </div>
            </form>
            <p>
              <a
                href="/dashboard/signin/forgot_password"
                class="font-medium text-white text-sm"
                >Esqueceu sua senha?</a
              >
            </p>
            </p>
            <p>
              <a
                href="/dashboard/signin/signup"
                class="font-medium text-white text-sm"
                >Não tem uma conta?</a
              >
            </p>
          </div>
        </div>
      </div>
      <p class="font-normal text-white mt-20 mx-auto w-max">
        Auth component for dark mode from
        <a
          href="https://horizon-ui.com/shadcn-ui?ref=twcomponents"
          target="_blank"
          class="text-brand-500 font-bold"
          >Horizon AI Boilerplate</a
        >
      </p>
    </div>

    <!-- 
      O código original em JS estava tentando popular o #app, 
      mas o HTML já está completo. Removi a tag <script> 
      que continha 'document.querySelector('#app').innerHTML = ...'
      pois ela não é necessária se este for o seu arquivo HTML principal.
    -->

`