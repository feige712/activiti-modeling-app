/*!
 * @license
 * Copyright 2019 Alfresco, Inc. and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { CardItemTypeService, CardViewUpdateService, LocalizedDatePipe } from '@alfresco/adf-core';
import { TranslateModule } from '@ngx-translate/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CardViewMessagePayloadItemComponent } from './message-payload-item.component';
import { MessagePayloadItemModel } from './message-payload-item.model';
import { Store } from '@ngrx/store';
import { AmaState } from 'ama-sdk';
import { of } from 'rxjs';
import { MessageVariableMappingService } from '../message-variable-mapping/message-variable-mapping.service';
import { HttpClientModule } from '@angular/common/http';
import { By } from '@angular/platform-browser';

describe('CardViewMessageItemComponent', () => {
    let fixture: ComponentFixture<CardViewMessagePayloadItemComponent>;
    let component: CardViewMessagePayloadItemComponent;
    let messageVariableMappingService: MessageVariableMappingService;
    let store: Store<AmaState>;

    const propertyMock = new MessagePayloadItemModel({
        label: 'PROCESS_EDITOR.ELEMENT_PROPERTIES.MESSAGE',
        value: '',
        key: '',
        data: {
            id: 'elementId'
        }
    });

    const processMock = {
        extensions: {
            properties: {
                processVariable1: {
                    id: 'processVariable1',
                    name: 'animalPV',
                    type: 'string',
                    value: '',
                    required: false
                }
            },
            mappings: {
                elementId: {
                    inputs: {
                        car: {
                            type: 'value',
                            value: 'ferrari'
                        }
                    }
                }
            }
        }
    };

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            providers: [
                CardItemTypeService,
                CardViewUpdateService,
                {
                    provide: Store,
                    useValue: {
                        select: jest.fn()
                    }
                },
                LocalizedDatePipe
            ],
            declarations: [CardViewMessagePayloadItemComponent],
            imports: [
                TranslateModule.forRoot(),
                HttpClientModule
            ],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CardViewMessagePayloadItemComponent);
        component = fixture.componentInstance;
        store = TestBed.get(Store);
        messageVariableMappingService = TestBed.get(MessageVariableMappingService);

        spyOn(store, 'select').and.returnValue(of(processMock));
        spyOn(messageVariableMappingService, 'updateMessagePayloadMapping');
        component.property = propertyMock;

        fixture.detectChanges();
    });

    it('should set process variables when process is retrieved', () => {
        expect(component.processVariables.length).toBe(1);
        expect(component.processVariables[0]).toBe(processMock.extensions.properties.processVariable1);
    });

    it('should set payload properties when process is retrieved', () => {
        expect(component.payloadProperties.length).toBe(1);
        expect(component.payloadProperties[0].name).toBe('car');
        expect(component.payloadProperties[0].value).toBe('ferrari');
    });

    it('should show form when add property button is clicked', () => {
        const showPropertiesForm = fixture.debugElement.query(By.css('#show-property-form'));
        expect(showPropertiesForm).toBeNull();

        const addProperty = fixture.debugElement.query(By.css('.messages-payload-add-button button'));
        addProperty.nativeElement.click();
        fixture.detectChanges();
        expect(showPropertiesForm).toBeDefined();
    });

    it('should add new property when new property is saved', () => {
        component.propertyName = 'new-property';
        component.propertyValue = 'new-property';

        expect(component.payloadProperties.length).toBe(1);

        component.saveProperty();
        fixture.detectChanges();

        expect(component.payloadProperties.length).toBe(2);
    });
});
